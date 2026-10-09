# Test Coverage Roadmap

**Current Status**: 24% (Phase 1)  
**Target**: 80%  
**Timeline**: 5-10 days (distributed across sprints)

---

## Coverage Breakdown

| Component | Current | Target | Priority |
|-----------|---------|--------|----------|
| Models | 100% ✅ | 100% | ✓ |
| Core (config, security, deps) | 50-100% | 95% | HIGH |
| API Endpoints | 9-52% | 80% | CRITICAL |
| Services | 0-33% | 80% | HIGH |
| **TOTAL** | **24%** | **80%** | - |

---

## Phase 1: Foundation (Current)

✅ **Completed**:
- conftest.py with test fixtures
- pytest.ini with configuration
- Basic endpoint tests (7 tests)
- Coverage report generation

**Status**: 24% coverage, 7 tests passing

---

## Phase 2: Core Endpoints (Next Sprint)

**Priority endpoints**:

1. **Authentication** (`/api/v1/auth`)
   - Login success/failure
   - Token generation
   - Token refresh
   - Profile endpoint
   - Target: 80% coverage

2. **Admin Users** (`/api/v1/admin/utenti`)
   - Create user
   - Update user
   - Delete user (soft delete)
   - List users
   - Reset password
   - Target: 70% coverage

3. **Projects** (`/api/v1/progetti`)
   - List projects
   - Get project detail
   - Create project
   - Update project
   - Target: 60% coverage

4. **Autorizzazioni** (`/api/v1/autorizzazioni-spesa`)
   - Create authorization
   - Approve (admin level)
   - Approve (DG level)
   - Budget validation
   - Target: 65% coverage

5. **Timesheet** (`/api/v1/timesheet`)
   - Create timesheet
   - Update rows
   - Submit/recall
   - Approve/reject
   - Target: 60% coverage

---

## Phase 3: Services & Edge Cases (Sprint 3+)

**To implement**:
- File upload service tests (file_upload.py)
- PDF generation tests (pdf_*.py)
- Storage/sync tests (storage.py)
- Error handling tests
- Concurrency tests (race conditions)
- Authorization/RBAC tests
- Budget reconciliation tests

**Target**: 80%+ coverage

---

## Test Structure

```
backend/tests/
├── conftest.py              ← Fixtures & setup
├── test_auth.py             ← Authentication tests
├── test_admin.py            ← Admin endpoints
├── test_projects.py         ← Project CRUD
├── test_autorizzazioni.py   ← Authorization workflow
├── test_timesheet.py        ← Timesheet workflow
├── test_budget.py           ← Budget calculations
├── test_permissions.py      ← RBAC tests
└── test_endpoints.py        ← Generic endpoint tests
```

---

## Running Tests

### All tests with coverage:
```bash
cd backend
pytest tests/ --cov=app --cov-report=html -v
```

### Specific test file:
```bash
pytest tests/test_auth.py -v
```

### Watch mode (requires pytest-watch):
```bash
ptw tests/ -- --cov=app
```

### Coverage report:
```bash
open htmlcov/index.html
```

---

## Critical Test Cases

### Authentication
- [ ] Invalid email/password
- [ ] Expired token
- [ ] Invalid token format
- [ ] Missing Authorization header
- [ ] Token refresh

### Authorization
- [ ] Admin-only endpoints reject non-admin
- [ ] PI-only endpoints reject non-PI
- [ ] Superadmin can access all
- [ ] Cross-project access denied

### Budget
- [ ] Cannot approve if budget insufficient
- [ ] Disponibilità calculation correct
- [ ] Race condition handling (pessimistic lock)
- [ ] Negative amounts rejected

### Timesheet
- [ ] Cannot submit after deadline
- [ ] Approval workflow (bozza → inviato → approvato)
- [ ] Rejection workflow
- [ ] Monthly hours validation (≤744)

### Files
- [ ] MIME validation
- [ ] Size limits (≤50MB)
- [ ] Path traversal prevented
- [ ] File cleanup on delete

---

## Next Steps

1. **Phase 2 Start**: Week of [DATE]
   - Implement auth tests
   - Implement admin/user tests
   - Reach 40% coverage

2. **Phase 3 Start**: Week of [DATE]
   - Implement endpoint tests
   - Implement service tests
   - Reach 65% coverage

3. **Final Polish**: Week of [DATE]
   - Edge case tests
   - Performance tests
   - Reach 80%+ coverage

---

## Notes

- Tests use in-memory SQLite for speed
- Fixtures isolate each test (transaction rollback)
- Use `@pytest.mark.integration` for slow tests
- Coverage gaps are acceptable in test_* files
- Focus on happy path → error cases → edge cases

**Owner**: Development Team  
**Last Updated**: 2026-10-09
