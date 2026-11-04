"use client";

import { useState } from "react";

const VALUES: [string, string][] = [
  ["Честност", "Издаваме само заглавия, които бихме подарили на близък човек. Без обещания за чудеса."],
  ["Достъпност", "Всяка книга има безплатен откъс. Част от аудио съдържанието е напълно безплатно."],
  ["Внимание", "Отговаряме на всяко съобщение лично. Зад Remind Books стоят хора, не автоматични отговори."],
];

/** Трите ценности в „За нас“ — отворена е една по една. */
export function Values() {
  const [open, setOpen] = useState(0);
  return (
    <div className="vals">
      {VALUES.map(([title, text], i) => (
        <button
          key={title}
          type="button"
          className="val glass"
          aria-expanded={open === i}
          onClick={() => setOpen(i)}
        >
          <span className="vorb" aria-hidden="true">
            {title[0]}
          </span>
          <span>
            <b>{title}</b>
            <span className="vd">{text}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
