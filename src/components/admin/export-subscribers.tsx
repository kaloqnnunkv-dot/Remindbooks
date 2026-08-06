"use client";

import { Button } from "../ui";
import { DownloadIcon } from "../icons";
import { useToast } from "../toast";

/**
 * Изтегляне на активните абонати като CSV.
 *
 * Файлът се генерира изцяло в браузъра — не се прави заявка към сървъра,
 * защото данните вече са заредени в страницата.
 */
export function ExportSubscribers({ emails }: { emails: string[] }) {
  const { toast } = useToast();

  function download() {
    if (emails.length === 0) {
      toast("Няма активни абонати за експорт.", "error");
      return;
    }

    // BOM в началото, за да разпознае Excel кирилицата коректно.
    const csv = `﻿email\n${emails.join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `remindbooks-abonati-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    toast(`Изтеглени ${emails.length} абоната.`);
  }

  return (
    <Button variant="outline" onClick={download}>
      <DownloadIcon size={16} />
      Изтегли активните абонати (CSV)
    </Button>
  );
}
