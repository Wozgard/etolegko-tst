# Decisions

- Тесты: встроенный `node:test` + `node:assert/strict`, без Jest/Vitest. Node 18 уже в окружении, лишние пакеты не нужны.
- HTTP в тестах: локальный `http.Server` на 127.0.0.1, не nock и не сеть.
- Скорость: KB/s = (totalBytes / 1024) / totalSeconds (кибибайты в секунду). totalSeconds — сумма длительностей десяти запросов, без промежутков между ними. averageRequestSeconds = totalSeconds / 10.
- API до CLI: `measure(url)` → `{ averageRequestSeconds, totalBytes, speedKBps }`.
- Реализация: глобальный `fetch`, без новых пакетов. Десять GET подряд, тело читается целиком. CLI печатает скорость как `<число> KB/s`.
- Тесты в `tests/` — Done when. Менять их можно только по прямому указанию человека. Приёмка: `npm test`, все зелёные.
- Репозиторий приватный: https://github.com/Wozgard/etolegko-tst, ветка `main`.
