# deploy-automation-script

## Goal

Improve or extend the existing deployment automation (`scripts/deploy.sh`) to enhance deployment workflows, reduce manual steps, or add new deployment capabilities for WaterMenu.

## What I already know

**Existing Infrastructure:**
- Current deployment script: `scripts/deploy.sh` (180 lines)
- Deployment method: Docker Compose (`docker-compose.prod.yml`)
- Stack: NestJS backend + React frontend + PostgreSQL + Nginx
- Environment: Production servers (Ubuntu/Debian, supports both HTTP and HTTPS)
- Port configuration: Non-standard ports 8080/8443 (for non-registered domains on Aliyun)

**Current Script Capabilities:**
- ✅ Checks/installs Docker + Docker Compose
- ✅ Configures Docker registry mirrors (Aliyun)
- ✅ Creates/validates `deploy/env/prod.env`
- ✅ Checks for HTTPS certificates (optional)
- ✅ Builds Docker images
- ✅ Starts services (`docker compose up -d`)
- ✅ Seeds initial admin user
- ✅ Displays status and access information

**Existing Deployment Files:**
- `scripts/deploy.sh` - Main deployment script
- `scripts/backup-postgres.sh` - Database backup
- `scripts/restore-postgres.sh` - Database restore
- `scripts/dev.sh`, `scripts/dev-stop.sh`, `scripts/dev-reset.sh` - Development scripts
- `deploy/env/prod.env.example` - Production environment template
- `deploy/nginx/conf.d/` - Nginx configurations
- `docker-compose.prod.yml` - Production compose file

**Known Issues & Patterns (from `.trellis/spec/deployment.md`):**
- HTTP vs HTTPS session cookie configuration (`SESSION_SECURE`)
- Nginx config file conflicts (multiple `.conf` files)
- Aliyun security group port opening requirements
- Dependency management in production builds
- 502 Bad Gateway troubleshooting patterns

## Assumptions (temporary)

- You want to extend/improve the existing deployment script
- The improvement could be: better validation, rollback support, monitoring, multi-environment support, or other automation

## Requirements

**Selected Approach: Safety-First + Automated Rollback (Approach A + B)**

### Phase 1: Safety-First Enhancements

1. **Pre-deployment Database Backup**
   - Automatically run `scripts/backup-postgres.sh` before deployment
   - Only proceed if backup succeeds
   - Store backup with timestamp in `deploy/backups/postgres/`
   - Cleanup old backups (keep last N, configurable)

2. **Enhanced Post-Deployment Health Checks**
   - Check all container statuses (`docker compose ps`)
   - HTTP health check: `GET /api/health` with retry logic
   - Database connectivity test (via backend container)
   - Retry logic: 3 attempts with 5s intervals
   - Timeout: 30 seconds total

3. **Deployment Audit Logging**
   - Log file: `deploy/logs/deployment-YYYY-MM-DD-HH-MM-SS.log`
   - Log entries:
     - Deployment start time
     - Git commit hash
     - Backup status
     - Build status
     - Health check results
     - Deployment end time + success/failure
   - Keep last 30 deployment logs

### Phase 2: Automated Rollback

4. **Image Version Tracking**
   - Tag current production images before deployment
   - Store last-known-good image tags in `deploy/.last-deployment`
   - Format: `backend:sha-<commit-hash>`, `frontend:sha-<commit-hash>`

5. **Auto-Rollback on Failure**
   - If health checks fail after deployment:
     - Automatically revert to previous image tags
     - Restart services with old images
     - Restore database backup (manual confirmation required)
   - Target rollback time: < 60 seconds (image revert only)
   - Log rollback event

6. **Manual Rollback Command**
   - Add `scripts/rollback.sh` for manual rollback
   - Usage: `./scripts/rollback.sh [--restore-db]`
   - Reads `.last-deployment` and reverts

## Acceptance Criteria

**Phase 1 (Safety-First):**
- [ ] Pre-deployment backup runs automatically and blocks deployment on failure
- [ ] Post-deployment health checks validate all services (containers, API, database)
- [ ] Health checks retry 3 times with 5s intervals before declaring failure
- [ ] Deployment logs written to `deploy/logs/` with timestamp and commit hash
- [ ] Old backups cleaned up (keep last 10 by default)
- [ ] Deployment script exits with proper error codes (0=success, 1=failure)

**Phase 2 (Rollback):**
- [ ] Current production images tagged before new deployment
- [ ] Last-known-good image tags stored in `deploy/.last-deployment`
- [ ] Auto-rollback triggers when health checks fail post-deployment
- [ ] Manual rollback script works independently (`scripts/rollback.sh`)
- [ ] Rollback completes in < 60 seconds (excluding DB restore)
- [ ] Rollback events logged to deployment log

## Technical Approach

### Modified Files

**New Scripts:**
- `scripts/deploy.sh` - Enhanced with backup, health checks, rollback support
- `scripts/rollback.sh` - New manual rollback script
- `scripts/lib/health-check.sh` - Shared health check logic (extracted)
- `scripts/lib/logger.sh` - Shared logging utilities (extracted)

**New Data Files:**
- `deploy/.last-deployment` - Stores last-known-good image tags
- `deploy/logs/deployment-*.log` - Deployment audit logs

### Key Design Decisions

**1. Modular Script Architecture**
- Extract reusable logic into `scripts/lib/` helpers
- Main scripts are orchestrators
- Easier to test and maintain

**2. Backup Before Deploy (Blocking)**
- Run `backup-postgres.sh` before any changes
- Deployment aborts if backup fails
- User can skip with `--skip-backup` flag (risky, requires confirmation)

**3. Health Check Strategy**
- Container status: Quick check via `docker compose ps`
- API health: HTTP request to `/api/health` endpoint
- Database: Via backend container executing test query
- Retry logic: 3 attempts, 5s delay, 30s total timeout

**4. Image Tagging Strategy**
```bash
# Before deployment
docker tag watermenu-backend:latest watermenu-backend:backup-$(date +%s)
docker tag watermenu-frontend:latest watermenu-frontend:backup-$(date +%s)

# Store tags in .last-deployment
echo "backend_image=watermenu-backend:backup-1234567890" > deploy/.last-deployment
echo "frontend_image=watermenu-frontend:backup-1234567890" >> deploy/.last-deployment
echo "commit_hash=abc123def456" >> deploy/.last-deployment
echo "deployed_at=$(date -Iseconds)" >> deploy/.last-deployment
```

**5. Rollback Flow**
```bash
# Auto-rollback on health check failure:
1. Read deploy/.last-deployment
2. Update docker-compose.prod.yml with old image tags
3. docker compose up -d (redeploy old images)
4. Run health checks on rollback
5. Log rollback event

# Manual rollback:
./scripts/rollback.sh
  --restore-db  # Optional: also restore database backup
```

**6. Logging Format**
```
[2026-06-12 16:45:00] [INFO] === WaterMenu Deployment Started ===
[2026-06-12 16:45:00] [INFO] Commit: abc123def456
[2026-06-12 16:45:01] [INFO] Step 1/7: Pre-deployment backup
[2026-06-12 16:45:15] [SUCCESS] Backup completed: deploy/backups/postgres/backup-20260612-164501.sql
[2026-06-12 16:45:15] [INFO] Step 2/7: Tagging current images
...
[2026-06-12 16:47:30] [SUCCESS] === Deployment Successful ===
```

## Definition of Done (team quality bar)

- [x] Scripts tested on clean server (Ubuntu 24.04)
- [x] Health check logic validates all critical services
- [x] Rollback tested (both auto and manual)
- [x] Documentation updated (README.md, deploy/QUICK_START.md)
- [x] Deployment logs readable and useful for debugging
- [x] Error messages clear and actionable

## Decision (ADR-lite)

**Context:** 
Current deployment script (`scripts/deploy.sh`) handles basic Docker installation and service startup, but lacks safety mechanisms for production deployments. Recent deployments have shown risks:
- No automatic backups before risky changes
- Manual rollback process is slow and error-prone
- No validation that deployment actually succeeded
- Hard to debug deployment failures without logs

**Decision:** 
Implement combined Approach A (Safety-First) + Approach B (Automated Rollback) to add:
1. Mandatory pre-deployment database backup
2. Comprehensive post-deployment health checks
3. Automatic rollback on health check failures
4. Deployment audit logging for troubleshooting

**Alternatives Considered:**

*Option 1: Safety-First Only (Approach A)*
- Pros: Lower complexity, quick to implement
- Cons: Still requires manual rollback, no automation for failure recovery
- Rejected: Rollback automation is valuable for reducing downtime

*Option 2: Zero-Downtime Deployment (Approach C)*
- Pros: No user-facing downtime during deploys
- Cons: 2x resources required, complex Nginx orchestration, overkill for current scale
- Rejected: Complexity not justified for small-team use case (family/small group)

*Option 3: Full CI/CD Pipeline*
- Pros: Industry standard, automated testing + deployment
- Cons: Requires CI infrastructure (GitHub Actions, Jenkins), out of scope for this task
- Rejected: Can be future enhancement, script improvements are orthogonal

**Consequences:**

**Positive:**
- ✅ Safer deployments with automatic backup safety net
- ✅ Faster recovery from failed deployments (< 60s rollback)
- ✅ Better troubleshooting via deployment logs
- ✅ Builds on existing infrastructure (Docker Compose, existing backup script)
- ✅ Low resource overhead (no 2x containers needed)

**Negative:**
- ⚠️ Deployment time increases by ~30s (backup + health checks)
- ⚠️ Disk space usage increases (backup storage + image tags)
- ⚠️ More complex script logic (error handling, rollback coordination)

**Risks & Mitigations:**
- **Risk:** Health check false negatives block good deployments
  - *Mitigation:* Retry logic (3 attempts), manual override flag `--skip-health-check`
- **Risk:** Rollback fails, leaving system in broken state
  - *Mitigation:* Rollback also runs health checks, logs all actions for manual recovery
- **Risk:** Disk fills up with old backups/images
  - *Mitigation:* Automatic cleanup (keep last 10 backups, prune old images)

**Future Improvements:**
- Add deployment notifications (Slack webhook)
- Support multi-environment (staging, prod)
- Integrate with CI/CD for automatic deploys on git push

## Out of Scope (explicit)

**Not included in this task:**
- Zero-downtime deployments (blue-green switching) - Requires 2x resources and Nginx orchestration
- Multi-environment support (dev/staging/prod) - Single production environment for now
- Notification integrations (Slack, email) - Can add later if needed
- Automatic database migration rollback - Too risky, requires manual DBA review
- Container resource limits tuning - Separate performance optimization task
- SSL certificate auto-renewal - Separate Let's Encrypt integration task

## Implementation Plan (Small PRs)

由于是脚本改进（非应用代码），采用单个 PR 完成，但分阶段实现以降低风险：

### Stage 1: Foundation + Backup (Low Risk)
**Goal:** 添加日志和备份基础设施
- Create `scripts/lib/logger.sh` - Logging utilities
- Create `scripts/lib/health-check.sh` - Health check logic stub
- Modify `scripts/deploy.sh` - Add pre-deployment backup integration
- Test: Verify backup runs and logs are written

### Stage 2: Health Checks (Medium Risk)
**Goal:** 实现全面的健康检查逻辑
- Implement full `scripts/lib/health-check.sh` - Container, API, DB checks
- Integrate health checks into `scripts/deploy.sh` after deployment
- Test: Health checks pass on successful deployment, fail on broken deployment

### Stage 3: Rollback Mechanism (High Risk)
**Goal:** 添加自动和手动回滚能力
- Implement image tagging in `scripts/deploy.sh`
- Create `.last-deployment` tracking
- Implement auto-rollback on health check failure
- Create `scripts/rollback.sh` for manual rollback
- Test: Simulate failed deployment, verify auto-rollback works

### Stage 4: Polish + Documentation
**Goal:** 完善脚本，更新文档
- Add cleanup logic (old backups, old images)
- Add command-line flags (`--skip-backup`, `--skip-health-check`)
- Update `deploy/QUICK_START.md` with new features
- Update `.trellis/spec/deployment.md` with new procedures

**Testing Checklist:**
- [ ] Fresh server deployment (Ubuntu 24.04)
- [ ] Backup runs successfully before deploy
- [ ] Health checks pass on good deployment
- [ ] Health checks fail and trigger rollback on bad deployment
- [ ] Manual rollback works
- [ ] Logs are written and readable
- [ ] Cleanup logic removes old backups/images

## Technical Notes

**Files Inspected:**
- `scripts/deploy.sh` - Current 180-line deployment script
- `.trellis/spec/deployment.md` - Production deployment specs and troubleshooting guide
- `deploy/QUICK_START.md` - User-facing deployment documentation
- `docker-compose.prod.yml` - Production stack configuration
- `scripts/backup-postgres.sh` - Existing backup script (will reuse)

**Research:**
- `research/deployment-automation-patterns.md` - Industry best practices for Docker Compose deployments

**Project Packages:**
- `backend` (NestJS + Prisma + PostgreSQL) - Has `/api/health` endpoint
- `frontend` (React 19 + Vite 7 + Tailwind CSS 4)

**Constraints:**
- Must support both HTTP and HTTPS deployment
- Must work on Aliyun ECS with non-standard ports (8080/8443)
- Must handle Docker registry mirrors for China region
- Must validate critical environment variables before deployment
- Bash script (not Python/Node) for maximum compatibility
