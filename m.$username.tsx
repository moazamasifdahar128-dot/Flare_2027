import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Phone, errText } from "@/components/shola/shell";
import { TopBack } from "@/components/flare/page";
import { useI18n } from "@/lib/shola/i18n";
import { acceptDm, blockUser, chatMeta, declineDm, sendMessage, thread } from "@/lib/shola/server";

export const Route = createFileRoute("/m/$username")({ component: Chat });

function Chat() {
  const { username } = Route.useParams();
  const { t } = useI18n();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof thread>>>([]);
  const [request, setRequest] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  function load() {
    thread({ data: username }).then(setRows).catch(() => undefined);
    chatMeta({ data: username }).then((row) => setRequest(row.request)).catch(() => undefined);
  }
  useEffect(load, [username]);

  return (
    <Phone bare>
      <div className="flex h-dvh flex-col">
        <header className="flex items-center gap-3 border-b border-line px-4 py-3">
          <TopBack />
          <h1 className="font-semibold">@{username}</h1>
        </header>
        <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
          {rows.map((m, i) => {
            const lastMine = m.mine && rows.slice(i + 1).every((n) => !n.mine);
            return (
              <div key={m.id} className={m.mine ? "ms-auto max-w-[80%]" : "max-w-[80%]"}>
                <p className={`rounded-2xl px-3 py-2 text-sm leading-6 ${m.mine ? "bg-primary text-ink" : "bg-surface"}`}>
                  {m.body.startsWith("data:image/") ? <img src={m.body} alt="" className="max-h-48 rounded-xl" /> : m.body}
                </p>
                {lastMine && <p className="mt-1 text-end text-[11px] text-muted">{m.read ? "Seen" : "Sent"}</p>}
              </div>
            );
          })}
        </div>
        {request ? (
          <div className="grid grid-cols-2 gap-2 px-4 pb-4">
            <button
              type="button"
              className="h-12 rounded-full bg-primary font-semibold text-ink"
              onClick={() => acceptDm({ data: username }).then(() => setRequest(false)).catch((err) => setError(errText(err, t)))}
            >
              Accept
            </button>
            <button
              type="button"
              className="h-12 rounded-full bg-surface font-semibold text-danger"
              onClick={() => {
                declineDm({ data: username }).then(() => history.back()).catch((err) => setError(errText(err, t)));
              }}
            >
              Delete
            </button>
            <button
              type="button"
              className="col-span-2 h-11 rounded-full text-sm text-danger"
              onClick={() => {
                blockUser({ data: username })
                  .then(() => declineDm({ data: username }))
                  .then(() => history.back())
                  .catch((err) => setError(errText(err, t)));
              }}
            >
              Block
            </button>
          </div>
        ) : (
        <form
          className="flex gap-2 px-3 pb-4"
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage({ data: { username, body } })
              .then(() => {
                setBody("");
                setError("");
                load();
              })
              .catch((err) => setError(errText(err, t)));
          }}
        >
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            id="dm-photo"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                const image = String(reader.result || "");
                sendMessage({ data: { username, body: "", image } }).then(load).catch((err) => setError(errText(err, t)));
              };
              reader.readAsDataURL(file);
            }}
          />
          <label htmlFor="dm-photo" className="grid h-12 w-12 place-items-center rounded-full bg-surface text-sm">+</label>
          <input value={body} onChange={(e) => setBody(e.target.value)} placeholder={t.type} className="h-12 flex-1 rounded-full bg-surface px-4 outline-none ring-1 ring-line" />
          <button className="h-12 rounded-full bg-primary px-4 font-semibold text-ink">{t.send}</button>
        </form>
        )}
        {error && <p className="px-4 pb-3 text-sm text-danger">{error}</p>}
      </div>
    </Phone>
  );
}
