// One-shot hand-over to Ghi điểm: {edit: entry} (Sửa) | {date: 'YYYY-MM-DD'} (Thêm điểm vào tuần này).
let D = null;
export const setDraft = d => { D = d; };
export const takeDraft = () => { const d = D; D = null; return d; };
