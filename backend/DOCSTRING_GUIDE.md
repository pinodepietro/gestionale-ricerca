# Documentation Guide

**Status**: Fix #15 (Phase 1 of 1)  
**Target**: 100% docstring coverage for all public functions

---

## Docstring Template

Use Google-style docstrings for consistency:

```python
def mio_endpoint(param1: str, param2: int = 10, db: Session = Depends(get_db)):
    """
    Brief description of what the function does.

    Longer description if needed. Explain the purpose, workflow, and any
    side effects or special behavior.

    Args:
        param1: Description of param1
        param2: Description of param2 (default: 10)
        db: Database session (injected)

    Returns:
        Description of return value. If dict/JSON:
        {
            "id": "uuid",
            "status": "success|error"
        }

    Raises:
        HTTPException 400: Bad request (when/why)
        HTTPException 401: Unauthorized (when/why)
        HTTPException 403: Forbidden (when/why)
        HTTPException 404: Not found (when/why)
        HTTPException 422: Unprocessable entity (validation failed)
        HTTPException 409: Conflict (e.g., duplicate key)
        HTTPException 500: Internal server error (when/why)

    Example:
        >>> response = client.post("/api/v1/endpoint", json={"key": "value"})
        >>> response.status_code
        200
    """
```

---

## Priority Docstrings

### Critical (Auth & Authorization)

#### `/auth`
- [x] POST /login
- [ ] POST /logout
- [ ] POST /refresh-token
- [ ] GET /profile
- [ ] PATCH /password

### High Priority (CRUD Operations)

#### `/admin`
- [ ] GET /utenti (list)
- [ ] POST /utenti (create)
- [ ] PATCH /utenti/{id} (update)
- [ ] DELETE /utenti/{id}
- [ ] POST /backup (create backup)
- [ ] GET /backup (list backups)

#### `/progetti`
- [ ] GET / (list projects)
- [ ] GET /{id} (get detail)
- [ ] POST / (create)
- [ ] PATCH /{id} (update)
- [ ] DELETE /{id}
- [ ] GET /{id}/budget (view budget)

#### `/autorizzazioni-spesa`
- [ ] GET / (list)
- [ ] POST / (create)
- [ ] POST /{id}/approva-ammin (admin approval)
- [ ] POST /{id}/approva-dg (DG approval)
- [ ] POST /{id}/reject (reject)

#### `/timesheet`
- [ ] GET / (list)
- [ ] POST / (create)
- [ ] PATCH /{id}/righe (update rows)
- [ ] POST /{id}/invia (submit)
- [ ] POST /{id}/richiama (recall)
- [ ] POST /{id}/approva (approve)

### Medium Priority (Complex Logic)

#### `/progetti/{id}/disponibilita`
- [ ] GET / (view budget availability)

#### `/sal`
- [ ] GET /{id} (view SAL detail)
- [ ] POST /{id}/approva (approve SAL)

#### `/andamento-mensile`
- [ ] GET /{id} (monthly report)

---

## Code Comment Guidelines

### When to Add Comments

✅ **DO comment**:
- Complex business logic (budget calculations, race conditions)
- Non-obvious algorithm choices
- Workarounds for external system limitations
- Critical security decisions
- Concurrency control mechanisms

❌ **DON'T comment**:
- What obvious code already says (`x = 5  # Set x to 5`)
- Obvious variable names
- Standard CRUD operations

### Comment Examples

```python
# ✅ Good - explains WHY
# Use pessimistic locking to prevent race conditions in concurrent budget approvals
bv = db.query(BudgetVoce).with_for_update().filter(...).first()

# ✅ Good - documents constraint
# Negative importi represent budget reversals (not supported yet)
if importo < 0:
    raise HTTPException(status_code=422, ...)

# ❌ Bad - obvious
# Get the budget item from database
bv = db.query(BudgetVoce).first()
```

---

## README Updates

### Current
- [ ] Installation instructions (already good)
- [ ] Running locally (already good)
- [x] Authentication flow (exists)
- [ ] API endpoint list (missing)
- [ ] Database schema (missing)
- [ ] Testing (NEW - added TEST_ROADMAP.md)
- [ ] Deployment (NEW - added SETUP_PRODUCTION_TLS.md)

### Add:
1. **API Documentation**: Link to `/api/docs` (Swagger)
2. **Architecture**: Diagram of main components
3. **Key Concepts**: Roles, budget, workflow states
4. **Troubleshooting**: Common errors and solutions

---

## FastAPI Auto-Documentation

The app already generates Swagger docs at:
- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc

FastAPI automatically extracts docstrings, so adding docstrings to functions
will automatically appear in the Swagger UI.

### How It Works

```python
@router.get("/users/{user_id}")
def get_user(user_id: str):
    """Get user by ID."""  # ← Appears in Swagger UI
    return {"id": user_id}
```

---

## Docstring Progress

| Component | Count | Done | % |
|-----------|-------|------|---|
| Auth endpoints | 5 | 1 | 20% |
| Admin endpoints | 8 | 0 | 0% |
| Project endpoints | 10 | 0 | 0% |
| Autorizzazioni | 8 | 0 | 0% |
| Timesheet | 7 | 0 | 0% |
| Other endpoints | 20+ | 0 | 0% |
| **TOTAL** | **58+** | **1** | **2%** |

---

## Next Steps

1. **Phase 1** (This week): Add docstrings to top 20 endpoints
2. **Phase 2** (Next week): Complete all endpoints
3. **Phase 3**: Add code comments to complex logic

---

## Automation

### Generate stub docstrings:
```bash
# Install pydocstyle
pip install pydocstyle

# Check which functions lack docstrings
pydocstyle app/api/v1/endpoints/*.py
```

### Validate docstring format:
```bash
# Check Google-style format
pip install darglint
darglint -v 2 app/api/v1/endpoints/auth.py
```

---

## Examples

See these well-documented files:
- `app/api/v1/utils/common.py` - Good docstring examples
- `app/core/deps.py` - RBAC validation logic

---

**Owner**: Development Team  
**Last Updated**: 2026-10-09
