# Known issues

- CLI-тест «без URL» сейчас красный, потому что `src/measure.js` ещё не точка входа: `node src/measure.js` завершается с кодом 0. Это ожидаемый red, не баг теста.
- Проверка порядка timestamps в sequential-тесте слабая; параллельность ловит только `maxConcurrent === 1`.
- `gh auth login` не принимает сохранённый токен Git Credential Manager: у него нет scope `read:org`. `git push` при этом работает. Для команд `gh` нужен отдельный вход.
