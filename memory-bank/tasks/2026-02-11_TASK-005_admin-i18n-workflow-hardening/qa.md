# QA Checklist
- [x] Admin-профиль доступен и объединяет нужные инструменты.
- [ ] Translation panel подгружает существующие переводы.
- [ ] Translation panel поддерживает edit/add.
- [ ] Все новые формы проходят i18n-first check.
- [ ] Редактор опросников отображает языковые поля по выбранным языкам.
- [x] Migration logic по удаленным/добавленным вопросам работает корректно.
- [x] Pre-load reconciliation блокирует несовместимый импорт.
- [ ] Все графики/аналитика используют полную шкалу USER-REQ.

## Verification
- Typecheck: ✅ (`npx tsc --noEmit`)
- Build: ✅ (`npm run build`)
