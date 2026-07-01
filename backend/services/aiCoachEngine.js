const { parseJsonLoose, validateRecommendationResult, validateTrainingPlanDraft } = require('../utils/aiSchemas');

function envNumber(name, fallback) {
  const n = Number.parseInt(process.env[name] || '', 10);
  return Number.isFinite(n) ? n : fallback;
}

function providerConfig() {
  const provider = String(process.env.AI_PROVIDER || 'openai').toLowerCase();
  const timeoutMs = envNumber('AI_TIMEOUT_MS', 8000);
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
  return { provider, timeoutMs, recModel, planModel };
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

async function withTimeout(task, timeoutMs) {
  const c = new AbortController();
  const timer = setTimeout(() => c.abort(), timeoutMs);
  try {
    return await task(c.signal);
  } finally {
    clearTimeout(timer);
  }
}

async function callChatJson({ model, system, user }) {
  const cfg = providerConfig();
  const endpoint = providerAuthAndUrl(cfg.provider);
  const startedAt = Date.now();
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
      const attempts = [
        { ...baseBody, response_format: { type: 'json_object' } },
        baseBody,
      ];
      let lastError = null;
      for (const body of attempts) {
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
        if (res.status < 500 && !text.includes('response_format')) break;
      }
      throw lastError || new Error('AI provider failed');
    },
    cfg.timeoutMs
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

async function generateCoachRecommendations(input) {
  const cfg = providerConfig();
  const system =
    'You are a sports coach recommendation engine. Return strict JSON only. ' +
    'Re-rank coaches for this player by overall fit. Prioritize: (1) number of matching weekly training days, ' +
    '(2) sport/skill fit, (3) location/city, (4) experience and ratings. ' +
    'Use baselineScore, breakdown, matchReasons, and matchingDays — do not invent scores.';
  const user = JSON.stringify(
    {
      task: 'Rank top coaches by overall fit',
      output: {
        rankedCoaches: [{ userId: 'coach_user_id' }],
      },
      constraints: {
        maxResults: input.limit,
        allowedCoachIds: input.candidates.map((c) => String(c.userId)),
      },
      player: input.player,
      candidates: input.candidates,
    },
    null,
    2
  );
  const raw = await callChatJson({ model: cfg.recModel, system, user });
  const validated = validateRecommendationResult(raw.payload, input.candidates.map((c) => c.userId), input.limit);
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
