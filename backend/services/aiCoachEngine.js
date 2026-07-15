const { parseJsonLoose, validateRecommendationResult, validateTrainingPlanDraft } = require('../utils/aiSchemas');

function envNumber(name, fallback) {
  const n = Number.parseInt(process.env[name] || '', 10);
  return Number.isFinite(n) ? n : fallback;
}

function providerConfig() {
  const provider = String(process.env.AI_PROVIDER || 'openai').toLowerCase();
  const timeoutMs = envNumber('AI_TIMEOUT_MS', 8000);
  const maxRetries = envNumber('AI_MAX_RETRIES', 3);
  const recDefault = provider === 'groq' ? 'llama-3.1-8b-instant' : 'gpt-4o-mini';
  const planDefault = provider === 'groq' ? 'llama-3.1-8b-instant' : 'gpt-4o-mini';
  const recModel = process.env.AI_MODEL_RECOMMENDATIONS || recDefault;
  const planModel = process.env.AI_MODEL_TRAINING_PLAN || planDefault;
  if (provider === 'groq' && /^gpt-/i.test(recModel + planModel)) {
    console.warn('[ai] model may be incompatible with groq provider. Use a Groq-hosted model id.');
  }
  if (provider === 'openai' && /^llama-/i.test(recModel + planModel)) {
    console.warn('[ai] model may be incompatible with openai provider. Use an OpenAI model id.');
  }
  return { provider, timeoutMs, maxRetries, recModel, planModel };
}

function providerAuthAndUrl(provider) {
  if (provider === 'groq') {
    if (!process.env.GROQ_API_KEY) throw new Error('Missing GROQ_API_KEY');
    return {
      url: 'https://api.groq.com/openai/v1/chat/completions',
      auth: process.env.GROQ_API_KEY,
      provider: 'groq',
    };
  }
  if (!process.env.OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY');
  return {
    url: 'https://api.openai.com/v1/chat/completions',
    auth: process.env.OPENAI_API_KEY,
    provider: 'openai',
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status) {
  return status === 429 || status === 503;
}

function isNonRetryableClientError(status) {
  return status === 400 || status === 401 || status === 403;
}

/** Parse Retry-After header (seconds or HTTP-date). Returns delay ms, or null. */
function retryAfterMs(res) {
  const raw = res.headers?.get?.('retry-after');
  if (!raw) return null;
  const seconds = Number.parseFloat(raw);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 30_000);
  const dateMs = Date.parse(raw);
  if (Number.isFinite(dateMs)) return Math.min(Math.max(0, dateMs - Date.now()), 30_000);
  return null;
}

function backoffDelayMs(attemptIndex, res) {
  const fromHeader = res ? retryAfterMs(res) : null;
  if (fromHeader != null) return fromHeader;
  return Math.min(1000 * 2 ** attemptIndex, 8000);
}

async function withTimeout(task, timeoutMs) {
  const c = new AbortController();
  const timer = setTimeout(() => c.abort(), timeoutMs);
  try {
    return await task(c.signal);
  } finally {
    clearTimeout(timer);
  }
}

async function callChatJson({ model, system, user, timeoutMs: timeoutOverride, maxRetries: retriesOverride }) {
  const cfg = providerConfig();
  const endpoint = providerAuthAndUrl(cfg.provider);
  const startedAt = Date.now();
  // Allow time for retries + backoff within overall budget
  const maxRetries = Math.max(0, retriesOverride != null ? retriesOverride : cfg.maxRetries);
  const baseTimeout = timeoutOverride != null ? timeoutOverride : cfg.timeoutMs;
  const totalTimeoutMs = baseTimeout + maxRetries * Math.min(baseTimeout, 8000);
  const data = await withTimeout(
    async (signal) => {
      const baseBody = {
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      };
      const bodies = [
        { ...baseBody, response_format: { type: 'json_object' } },
        baseBody,
      ];
      let lastError = null;

      for (let bodyIndex = 0; bodyIndex < bodies.length; bodyIndex += 1) {
        const body = bodies[bodyIndex];
        let skipToNextBody = false;

        for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
          if (signal.aborted) {
            throw lastError || new Error('AI provider request aborted');
          }

          const res = await fetch(endpoint.url, {
            method: 'POST',
            signal,
            headers: {
              Authorization: `Bearer ${endpoint.auth}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          });

          if (res.ok) {
            return res.json();
          }

          const text = await res.text();
          lastError = new Error(`AI provider failed (${res.status}): ${text.slice(0, 200)}`);

          if (text.includes('response_format') && bodyIndex === 0) {
            skipToNextBody = true;
            break;
          }

          if (isNonRetryableClientError(res.status)) {
            throw lastError;
          }

          if (isRetryableStatus(res.status) && attempt < maxRetries) {
            const delay = backoffDelayMs(attempt, res);
            console.warn(
              `[ai] ${endpoint.provider} ${res.status}; retry ${attempt + 1}/${maxRetries} in ${delay}ms`
            );
            await sleep(delay);
            continue;
          }

          // Non-retryable 4xx (except response_format path), or retries exhausted
          if (res.status < 500 && !isRetryableStatus(res.status)) {
            throw lastError;
          }

          if (attempt >= maxRetries) {
            throw lastError;
          }

          const delay = backoffDelayMs(attempt, res);
          console.warn(
            `[ai] ${endpoint.provider} ${res.status}; retry ${attempt + 1}/${maxRetries} in ${delay}ms`
          );
          await sleep(delay);
        }

        if (skipToNextBody) continue;
        break;
      }

      throw lastError || new Error('AI provider failed');
    },
    totalTimeoutMs
  );

  const content = data?.choices?.[0]?.message?.content;
  const normalizedContent = Array.isArray(content)
    ? content
        .map((part) => (typeof part === 'string' ? part : part?.text || ''))
        .join('\n')
    : content;
  return {
    provider: endpoint.provider,
    model,
    latencyMs: Date.now() - startedAt,
    payload: parseJsonLoose(normalizedContent),
  };
}

function trimRecommendationCandidates(candidates) {
  return (candidates || []).map((c) => ({
    userId: String(c.userId),
    fullName: c.fullName || '',
    city: c.city || '',
    specialties: c.specialties || [],
    coachingCategories: c.coachingCategories || [],
    preferredPlayerLevels: c.preferredPlayerLevels || [],
    yearsExperience: c.yearsExperience || 0,
    averageRating: c.averageRating || 0,
    ratingCount: c.ratingCount || 0,
    baselineScore: c.baselineScore,
    breakdown: c.breakdown,
    matchReasons: c.matchReasons,
    matchingDays: c.matchingDays ?? 0,
  }));
}

async function generateCoachRecommendations(input) {
  const cfg = providerConfig();
  const system =
    'You are a sports coach recommendation engine. Return strict JSON only. ' +
    'Re-rank coaches for this player by overall fit. Prioritize: (1) number of matching weekly training days, ' +
    '(2) sport/skill fit, (3) location/city, (4) experience and ratings. ' +
    'Use baselineScore, breakdown, matchReasons, and matchingDays — do not invent scores.';
  const candidates = trimRecommendationCandidates(input.candidates);
  const user = JSON.stringify({
    task: 'Rank top coaches by overall fit',
    output: {
      rankedCoaches: [{ userId: 'coach_user_id' }],
    },
    constraints: {
      maxResults: input.limit,
      allowedCoachIds: candidates.map((c) => c.userId),
    },
    player: input.player,
    candidates,
  });
  const raw = await callChatJson({
    model: cfg.recModel,
    system,
    user,
    timeoutMs: envNumber('AI_REC_TIMEOUT_MS', 4000),
    maxRetries: envNumber('AI_REC_MAX_RETRIES', 1),
  });
  const validated = validateRecommendationResult(raw.payload, candidates.map((c) => c.userId), input.limit);
  if (!validated) throw new Error('Invalid AI recommendation payload');
  return { ...validated, provider: raw.provider, model: cfg.recModel, latencyMs: raw.latencyMs };
}

async function generateTrainingPlanDraft(input) {
  const cfg = providerConfig();
  const system =
    'You are an expert sports coach assistant. Return strict JSON only. Build a weekly plan from the player skill evaluation data. ' +
    'Prioritize weakSkills and critical skills with specific drills. Mention scores when explaining why each drill is assigned. ' +
    'Do not give generic plans — every exercise block must tie to listed weak skills. Keep concise, practical, and safe.';
  const user = JSON.stringify(
    {
      task: 'Generate personalized weekly training draft from skill evaluation gaps',
      output: {
        title: 'Week plan title',
        goals: 'Main goals — reference weak skills by name and score',
        exercises: 'Day-by-day program with drills for each weak skill',
        analysisSummary: 'Short analysis: weakest skills, why they need work, strengths to maintain',
      },
      constraints: {
        mustReferenceWeakSkills: true,
        weakSkills: input.skillGaps?.focusSkills || [],
        criticalSkills: input.skillGaps?.critical || [],
      },
      context: input,
    },
    null,
    2
  );
  const raw = await callChatJson({ model: cfg.planModel, system, user });
  const validated = validateTrainingPlanDraft(raw.payload);
  if (!validated) throw new Error('Invalid AI training plan payload');
  const analysisSummary = String(raw.payload?.analysisSummary || '').trim().slice(0, 5000);
  return {
    ...validated,
    analysisSummary: analysisSummary || undefined,
    provider: raw.provider,
    model: cfg.planModel,
    latencyMs: raw.latencyMs,
  };
}

module.exports = {
  providerConfig,
  generateCoachRecommendations,
  generateTrainingPlanDraft,
};
