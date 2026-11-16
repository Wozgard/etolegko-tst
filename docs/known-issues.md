# Known issues

- Проверка порядка timestamps в sequential-тесте слабая; параллельность ловит только `maxConcurrent === 1`.
- `gh auth login` не принимает сохранённый токен Git Credential Manager: у него нет scope `read:org`. `git push` при этом работает. Для команд `gh` нужен отдельный вход.
