# REST API Reference — Sports Ecosystem Platform

Base URL: `http://localhost:5000/api` (configurable).  
Auth: `Authorization: Bearer <JWT>` unless noted.

## Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register player, coach, or business_owner (+ profile payload) |
| POST | `/auth/login` | Login; returns JWT |
| GET | `/auth/me` | Current user + profile |
| DELETE | `/auth/me` | Permanently delete own account (body: `password`, `confirm: "DELETE"`); email can re-register |
| POST | `/auth/password-reset-request` | Placeholder — records intent (email integration optional) |

## Player
| Method | Path | Description |
|--------|------|-------------|
| GET | `/players/me/profile` | Player profile |
| PUT | `/players/me/profile` | Update profile |
| GET | `/players/recommendations` | Automated coach recommendations |
| POST | `/players/training-requests` | Request training |
| GET | `/players/training-requests` | List my requests |
| GET | `/players/training-sessions` | Training schedule |
| GET | `/players/training-plans` | Weekly plans visible to player |
| POST | `/players/ground-bookings/hold` | Hold slot ~5 min |
| POST | `/players/ground-bookings/:id/confirm-payment` | Confirm after payment |
| GET | `/players/ground-bookings` | My ground bookings |
| DELETE | `/players/ground-bookings/:id` | Cancel (with rules) |
| GET | `/players/performance` | Points & history |
| GET | `/players/products` | Browse equipment |
| POST | `/players/orders` | Purchase equipment |
| GET | `/players/orders` | My orders |
| POST | `/players/coaches/:coachId/feedback` | Rate coach |
| POST | `/players/payments/coach` | Pay coach fees |
| GET | `/players/notifications` | Notifications |
| PATCH | `/players/notifications/:id/read` | Mark read |
| POST | `/players/complaints` | File complaint / dispute |

## Coach
| Method | Path | Description |
|--------|------|-------------|
| GET | `/coaches/me/profile` | Coach profile |
| PUT | `/coaches/me/profile` | Update profile |
| PUT | `/coaches/me/availability` | Availability |
| GET | `/coaches/training-requests` | Incoming requests |
| PATCH | `/coaches/training-requests/:id` | Accept/reject |
| GET | `/coaches/training-sessions` | Sessions |
| POST | `/coaches/training-plans` | Create/modify weekly plan |
| GET | `/coaches/training-plans` | List plans |
| PUT | `/coaches/training-plans/:id` | Update plan |
| POST | `/coaches/sessions/:sessionId/attendance` | Mark attendance |
| POST | `/coaches/performance` | Weekly performance points |
| GET | `/coaches/players/:playerId/progress` | Progress history |
| GET | `/coaches/ground-bookings` | Grounds for my training |
| GET | `/coaches/feedback` | Ratings & feedback |
| POST | `/coaches/feedback/:id/reply` | Reply to feedback |
| GET | `/coaches/payments` | Received payments / balance view |
| GET | `/coaches/notifications` | Notifications |
| POST | `/coaches/documents` | Upload certifications |
| GET | `/coaches/documents` | List documents |

## Business owner
| Method | Path | Description |
|--------|------|-------------|
| GET | `/business/me/profile` | Profile + store |
| PUT | `/business/me/profile` | Update |
| POST | `/business/subscription` | Subscribe package |
| POST | `/business/subscription/renew` | Renew |
| PUT | `/business/store` | Configure store |
| GET | `/business/products` | List own products |
| POST | `/business/products` | Add product — quota enforced |
| PUT | `/business/products/:id` | Update |
| DELETE | `/business/products/:id` | Delete — restores quota |
| PATCH | `/business/products/:id/pricing` | Pricing |
| PATCH | `/business/products/:id/stock` | Stock |
| POST | `/business/products/:id/images` | Images |
| GET | `/business/orders` | Orders |
| PATCH | `/business/orders/:id` | Update order status |
| GET | `/business/reports/sales` | Basic sales report |
| GET | `/business/coaches` | Coach directory |
| POST | `/business/coaches/:coachId/partnership` | Partnership request |
| GET | `/business/notifications` | Notifications |
| POST | `/business/documents` | Verification docs |
| GET | `/business/documents` | List documents |

## Admin
| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/dashboard` | Statistics |
| GET | `/admin/verification/coaches` | Coach verification queue |
| PATCH | `/admin/verification/coaches/:userId` | Approve/reject/more-info |
| GET | `/admin/verification/business` | Business verification queue |
| PATCH | `/admin/verification/business/:userId` | Approve/reject/more-info |
| GET | `/admin/users` | User list |
| PATCH | `/admin/users/:id` | Update/suspend |
| DELETE | `/admin/users/:id` | Delete with safeguards |
| GET | `/admin/coaches` | Manage coaches |
| GET | `/admin/business-owners` | Manage businesses |
| CRUD | `/admin/sports` | Sport categories |
| CRUD | `/admin/grounds` | Grounds & slots config |
| GET | `/admin/monitor/bookings` | Ground bookings |
| GET | `/admin/monitor/performance` | System health & platform stats |
| GET | `/admin/complaints` | Complaints list |
| PATCH | `/admin/complaints/:id` | Resolve |
| GET | `/admin/reports/summary` | Reports |
| GET | `/admin/subscriptions` | Business subscription payments |
| GET | `/admin/settings` | Settings |
| PUT | `/admin/settings` | Update settings |

## Public (unauthenticated browse where appropriate)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/public/grounds` | Listed grounds |
| GET | `/public/products` | Listed products |

## Uploads
| Method | Path | Description |
|--------|------|-------------|
| POST | `/uploads/document` | Multipart document (coach/business) |
| POST | `/uploads/image` | Multipart image (product) |
