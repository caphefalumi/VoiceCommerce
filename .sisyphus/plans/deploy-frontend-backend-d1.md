# Deployment Work Plan: Frontend + Backend + D1 Migration

## Context

**Goal**: Migrate from local MongoDB to Cloudflare D1, deploy frontend to Cloudflare Pages, deploy Java backend to Railway.

**Current Architecture**:
- Frontend: TanStack React (Vite) - runs locally
- Backend: Spring Boot Java - runs locally on port 8080
- Database: MongoDB local
- AI Worker: Cloudflare Workers with AI + Vectorize

**Target Architecture**:
- Frontend: Cloudflare Pages
- Backend: Railway
- Database: Cloudflare D1 (migrated from MongoDB)
- AI Worker: Cloudflare Workers (existing)

---

## Work Objectives

### Core Objective
Deploy the full stack application with:
1. Frontend → Cloudflare Pages
2. Backend → Railway  
3. Database → Cloudflare D1 (migrated from MongoDB)

### Concrete Deliverables
- [ ] Frontend deployed to Cloudflare Pages (auto-deploy on push to main)
- [ ] Backend deployed to Railway
- [ ] D1 database created and schema applied
- [ ] Data migrated from MongoDB to D1
- [ ] API Worker with D1 binding deployed

### Definition of Done
- [ ] Frontend accessible at *.pages.dev URL
- [ ] Backend accessible at Railway domain
- [ ] Products load from D1 database
- [ ] Cart functionality works with D1
- [ ] Voice AI worker still functions with D1

---

## Scope

### INCLUDE
1. **Frontend (Cloudflare Pages)**
   - Configure wrangler.toml for Pages
   - Update API base URL for production
   - Set up GitHub Actions for auto-deploy

2. **Backend (Railway)**
   - Update Terraform for Railway deployment
   - Configure environment variables (remove MongoDB)
   - Deploy Spring Boot JAR to Railway

3. **Database (D1 Migration)**
   - Create D1 database
   - Apply schema migration
   - Export data from MongoDB
   - Import data to D1
   - Update API Worker to use D1

### EXCLUDE
- MongoDB cleanup (keep locally for now)
- Custom domain setup (future task)
- CI/CD improvements beyond basic deployment

---

## Task Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  1. D1 Setup    │────▶│  2. Data Migrate │────▶│  3. API Worker  │
│  Create DB      │     │  MongoDB → D1    │     │  Deploy D1 API │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  6. Terraform   │◀────│  5. Railway     │◀────│  4. Frontend    │
│  Update         │     │  Deploy Backend │     │  Cloudflare    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## TODOs

### Phase 1: D1 Database Setup

- [ ] 1.1 Create D1 database via Cloudflare dashboard or `wrangler d1 create tgdd-db`
- [ ] 1.2 Update wrangler.toml with D1 binding and database_id
- [ ] 1.3 Apply schema: `wrangler d1 execute tgdd-db --file=./drizzle/001_initial_schema.sql`

### Phase 2: MongoDB to D1 Migration

- [ ] 2.1 Run migration script to export from MongoDB: `python migrate_mongo_to_d1.py`
- [ ] 2.2 Verify generated SQL in drizzle/002_migrate_data.sql
- [ ] 2.3 Import data: `wrangler d1 execute tgdd-db --file=./drizzle/002_migrate_data.sql`
- [ ] 2.4 Verify data: `wrangler d1 execute tgdd-db --command="SELECT COUNT(*) FROM products"`

### Phase 3: API Worker with D1

- [ ] 3.1 Create api-worker/ with wrangler.json (D1 binding only, no AI)
- [ ] 3.2 Implement REST API in api-worker/src/index.ts (products, users, cart, auth)
- [ ] 3.3 Deploy API worker: `wrangler deploy`

### Phase 4: Frontend - Cloudflare Pages

- [ ] 4.1 Create _routes.json for SPA routing (if needed)
- [ ] 4.2 Update src/lib/api.ts to use production API URL
- [ ] 4.3 Build frontend: `npm run build`
- [ ] 4.4 Deploy via Cloudflare dashboard or `wrangler pages deploy dist`
- [ ] 4.5 Alternatively: push to GitHub and set up Cloudflare Pages in dashboard

### Phase 5: Backend - Railway

- [ ] 5.1 Update Terraform main.tf:
  - Remove MongoDB service
  - Keep Railway project/environment
- [ ] 5.2 Update spring-backend/src/main/resources/application.properties:
  - Remove MongoDB config (no longer needed since API is in Cloudflare)
  - Or keep minimal config for local dev
- [ ] 5.3 Build JAR: `./mvnw clean package -DskipTests`
- [ ] 5.4 Deploy to Railway via dashboard or CLI
- [ ] 5.5 Update frontend .env.production with Railway URL (if still needed)

### Phase 6: Verification

- [ ] 6.1 Test frontend loads products from D1
- [ ] 6.2 Test cart add/remove
- [ ] 6.3 Test voice AI search works
- [ ] 6.4 Verify no MongoDB dependencies in production

---

## References

### Existing Files
- `drizzle/001_initial_schema.sql` - D1 schema
- `migrate_mongo_to_d1.py` - Migration script
- `src/lib/api.ts` - Frontend API client
- `ai-worker/src/index.ts` - AI worker with D1 routes (needs DB binding added)

### Cloudflare CLI Commands
```bash
# Create D1
wrangler d1 create tgdd-db

# Apply schema
wrangler d1 execute tgdd-db --file=./drizzle/001_initial_schema.sql

# Import data
wrangler d1 execute tgdd-db --file=./drizzle/002_migrate_data.sql

# Deploy API worker
cd api-worker && wrangler deploy

# Deploy frontend
wrangler pages deploy dist
```

### Railway Commands
```bash
# Install Railway CLI
railway login
railway init

# Deploy
railway up
```

---

## Commit Strategy

| After Task | Message | Files |
|------------|---------|-------|
| Phase 1 | `feat(d1): create database schema` | drizzle/* |
| Phase 2 | `feat(d1): migrate data from mongodb` | drizzle/* |
| Phase 3 | `feat(api): add d1 api worker` | api-worker/* |
| Phase 4 | `feat(deploy): cloudflare pages frontend` | wrangler.toml, _routes.json |
| Phase 5 | `feat(deploy): railway backend` | infra/terraform/* |
| Phase 6 | `fix: update api urls for production` | .env.production |
