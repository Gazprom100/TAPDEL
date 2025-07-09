# 🔧 СРОЧНОЕ ИСПРАВЛЕНИЕ REDIS_URL

## ❌ Текущая проблема:
```
❌ Redis ошибка: ConnectionTimeoutError: Connection timeout
```

## 🎯 РЕШЕНИЕ:

**В Render Dashboard → TAPDEL → Environment замените REDIS_URL на:**

```bash
REDIS_URL=redis://default:AVGhAAIjcDFmODU5MjExNTVlNjg0NjQ0ODkwZDg0ODM2Y2FlZjYyNnAxMA@inviting-camel-20897.upstash.io:6379
```

**ВАЖНО:** Убираем `rediss://` и используем `redis://` без TLS, так как Upstash может работать без TLS на порту 6379.

## 🚀 Альтернативные варианты:

### Вариант 1 (без TLS):
```bash
REDIS_URL=redis://default:AVGhAAIjcDFmODU5MjExNTVlNjg0NjQ0ODkwZDg0ODM2Y2FlZjYyNnAxMA@inviting-camel-20897.upstash.io:6379
```

### Вариант 2 (с TLS на 6380):
```bash
REDIS_URL=rediss://default:AVGhAAIjcDFmODU5MjExNTVlNjg0NjQ0ODkwZDg0ODM2Y2FlZjYyNnAxMA@inviting-camel-20897.upstash.io:6380
```

### Вариант 3 (альтернативный формат Upstash):
```bash
REDIS_URL=rediss://:AVGhAAIjcDFmODU5MjExNTVlNjg0NjQ0ODkwZDg0ODM2Y2FlZjYyNnAxMA@inviting-camel-20897.upstash.io:6380
```

## 📋 План действий:

1. **Render Dashboard → TAPDEL → Environment**
2. **Найти REDIS_URL**
3. **Заменить на Вариант 1** (без TLS)
4. **Save Changes**
5. **Manual Deploy** (если не помогает, попробовать Вариант 2)

## 🧪 Тестирование:

После исправления:
```bash
curl https://tapdel.onrender.com/api/decimal/info
```

Должен вернуть информацию о DecimalChain вместо timeout ошибок.

---

**Приоритет:** КРИТИЧЕСКИЙ - без Redis DecimalChain не работает! 