"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { MapTypeSwitch } from "~/components/map/MapTypeSwitch";
import { ItineraryForm } from "~/components/ItineraryForm";
import { MapView, type MapLine, type MapMarker } from "~/components/map/MapView";
import {
  Alert,
  ConfirmDialog,
  EmptyState,
  Field,
  Modal,
  Spinner,
  StatusChip,
  Stars,
  useErrorMessage,
  useToast,
} from "~/components/ui";
import { VisitFormModal } from "~/components/VisitFormModal";
import { useFormat, useT } from "~/lib/i18n";
import { api, type RouterOutputs } from "~/trpc/react";
import { VisitContextChip, VisitStatusChip } from "~/components/chips";
import { Icon } from "~/components/Icon";

const C_PLANNED = "#0077B6";
const C_ACTUAL = "#059669";
const C_UNEXPECTED = "#D97706";

type Stop = RouterOutputs["itinerary"]["get"]["stops"][number];

export default function ItineraryDetailPage() {
  const { uid } = useParams<{ uid: string }>();
  const { t } = useT();
  const fmt = useFormat();
  const router = useRouter();
  const toast = useToast();
  const errMsg = useErrorMessage();
  const utils = api.useUtils();
  const { data: it, isLoading } = api.itinerary.get.useQuery({ uid });
  const options = api.place.options.useQuery();

  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editStop, setEditStop] = useState<Stop | null>(null);
  const [rmStop, setRmStop] = useState<Stop | null>(null);
  const [visitFor, setVisitFor] = useState<null | { placeUid: string; stopUid?: string }>(null);
  const [unexpectedOpen, setUnexpectedOpen] = useState(false);
  const [layers, setLayers] = useState({ planned: true, actual: true });

  const refresh = () => void utils.itinerary.get.invalidate({ uid });
  const onErr = (e: unknown) => setError(errMsg(e));

  const update = api.itinerary.update.useMutation({ onSuccess: () => { refresh(); setEditOpen(false); toast.push(t("common.saved"), "success"); }, onError: onErr });
  const del = api.itinerary.delete.useMutation({ onSuccess: () => { toast.push(t("common.deleted"), "success"); router.push("/itineraries"); }, onError: onErr });
  const addPlace = api.itinerary.addPlace.useMutation({ onSuccess: () => { refresh(); setAddOpen(false); toast.push(t("common.saved"), "success"); }, onError: onErr });
  const updPlace = api.itinerary.updatePlace.useMutation({ onSuccess: () => { refresh(); setEditStop(null); toast.push(t("common.saved"), "success"); }, onError: onErr });
  const rmPlace = api.itinerary.removePlace.useMutation({ onSuccess: () => { refresh(); setRmStop(null); }, onError: (e) => { onErr(e); setRmStop(null); } });
  const reorder = api.itinerary.reorder.useMutation({ onSuccess: refresh, onError: onErr });

  const { markers, lines } = useMemo(() => {
    const markers: MapMarker[] = [];
    const lines: MapLine[] = [];
    if (!it) return { markers, lines };
    if (layers.planned) {
      it.stops.forEach((s, i) =>
        markers.push({ id: `p${s.uid}`, lat: s.place.latitude, lng: s.place.longitude, color: C_PLANNED, glyph: String(i + 1), title: `${i + 1}. ${s.place.name}` }),
      );
      lines.push({ id: "planned", path: it.stops.map((s) => ({ lat: s.place.latitude, lng: s.place.longitude })), color: C_PLANNED, dashed: true });
    }
    if (layers.actual) {
      it.actual.forEach((a, i) =>
        markers.push({ id: `a${a.uid}`, lat: a.place.latitude, lng: a.place.longitude, color: a.kind === "UNEXPECTED" ? C_UNEXPECTED : C_ACTUAL, glyph: String(i + 1), title: `${i + 1}. ${a.place.name}` }),
      );
      lines.push({ id: "actual", path: it.actual.map((a) => ({ lat: a.place.latitude, lng: a.place.longitude })), color: C_ACTUAL });
    }
    return { markers, lines };
  }, [it, layers]);

  if (isLoading) return <Spinner />;
  if (!it) return <EmptyState title={t("itinerary.notFound")} action={<Link href="/itineraries" className="btn btn-primary">{t("nav.itineraries")}</Link>} />;

  const move = (idx: number, dir: -1 | 1) => {
    const order = it.stops.map((s) => s.uid);
    const j = idx + dir;
    if (j < 0 || j >= order.length) return;
    [order[idx], order[j]] = [order[j]!, order[idx]!];
    reorder.mutate({ itineraryUid: uid, order });
  };

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <p style={{ margin: 0 }}><Link href="/itineraries" className="muted"><Icon name="arrow-left" /> {t("nav.itineraries")}</Link></p>
          <h1>{it.name}</h1>
          <p>{it.startDate || it.endDate ? `${fmt.date(it.startDate)} – ${fmt.date(it.endDate)}` : t("itinerary.noDates")}</p>
          {it.description && <p style={{ whiteSpace: "pre-wrap" }}>{it.description}</p>}
        </div>
        <div className="row">
          <button className="btn btn-secondary" onClick={() => { setError(null); setEditOpen(true); }}><Icon name="pen" /> {t("common.edit")}</button>
          <button className="btn btn-danger-ghost" onClick={() => setDelOpen(true)}><Icon name="trash" /> {t("common.delete")}</button>
        </div>
      </div>

      {error && <div style={{ marginBottom: 16 }}><Alert kind="error">{error}</Alert></div>}

      <div className="card stack-sm" style={{ marginBottom: 24 }}>
        <div className="row-between">
          <h2 className="card-title" style={{ margin: 0 }}>{t("itinerary.route")}</h2>
          <div className="row">
            <button className="chip" aria-pressed={layers.planned} onClick={() => setLayers((l) => ({ ...l, planned: !l.planned }))}>{t("itinerary.planned")}</button>
            <button className="chip" aria-pressed={layers.actual} onClick={() => setLayers((l) => ({ ...l, actual: !l.actual }))}>{t("itinerary.actual")}</button>
          </div>
        </div>
        <div className="legend">
          <span><i className="line dashed" style={{ borderColor: C_PLANNED }} /> {t("itinerary.legendPlanned")}</span>
          <span><i className="line" style={{ borderColor: C_ACTUAL }} /> {t("itinerary.legendActual")}</span>
          <span><i style={{ background: C_UNEXPECTED }} /> {t("visit.unexpected")}</span>
        </div>
        <MapTypeSwitch />
        <div className="map-box-md">
          <MapView markers={markers} lines={lines} fit />
        </div>
        <p className="helper" style={{ margin: 0 }}>{t("itinerary.routeNote")}</p>
      </div>

      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <div className="card card-flush">
          <div className="row-between" style={{ padding: 16, borderBottom: "1px solid var(--color-border)" }}>
            <h2 className="card-title" style={{ margin: 0 }}>{t("itinerary.plannedStops")} ({it.stops.length})</h2>
            <button className="btn btn-primary btn-sm" onClick={() => { setError(null); setAddOpen(true); }}><Icon name="plus" /> {t("itinerary.addStop")}</button>
          </div>
          {!it.stops.length ? (
            <EmptyState title={t("itinerary.noStops")} text={t("itinerary.noStopsHint")} />
          ) : (
            <ul className="list">
              {it.stops.map((s, i) => (
                <li key={s.uid} className="list-item" style={{ alignItems: "flex-start" }}>
                  <span className="mono" style={{ width: 24, color: C_PLANNED, fontWeight: 700 }}>{i + 1}</span>
                  <div className="grow stack-sm" style={{ gap: 4 }}>
                    <Link href={`/places/${s.place.uid}`} className="title" style={{ color: "var(--color-primary)" }}>{s.place.name}</Link>
                    <span className="sub">
                      {s.plannedDate ? fmt.date(s.plannedDate) : t("itinerary.noDate")}
                      {s.plannedTime ? ` · ${s.plannedTime.slice(0, 5)}` : ""}
                    </span>
                    {s.note && <span className="t-small" style={{ whiteSpace: "pre-wrap" }}>{s.note}</span>}
                    <div className="row">
                      {s.visitCount > 0 ? <span className="vis vis-visited"><Icon name="map-pin" fixedWidth={false} />{t("itinerary.visitedCount", { n: s.visitCount })}</span> : <VisitStatusChip status="PLAN" />}
                      {!s.place.isActive && <StatusChip tone="neutral">{t("common.inactive")}</StatusChip>}
                    </div>
                    <div className="row">
                      {s.place.isActive && <button className="btn btn-secondary btn-sm" onClick={() => setVisitFor({ placeUid: s.place.uid, stopUid: s.uid })}>{t("visit.add")}</button>}
                      <button className="btn btn-ghost btn-sm" onClick={() => { setError(null); setEditStop(s); }}><Icon name="pen" /> {t("common.edit")}</button>
                      <button className="btn btn-danger-ghost btn-sm" onClick={() => setRmStop(s)}><Icon name="unlink" /> {t("common.remove")}</button>
                    </div>
                  </div>
                  <div className="stack-sm" style={{ gap: 4 }}>
                    <button className="btn btn-ghost btn-sm btn-icon" disabled={i === 0 || reorder.isPending} onClick={() => move(i, -1)} aria-label={t("itinerary.moveUp")}><Icon name="chevron-up" /></button>
                    <button className="btn btn-ghost btn-sm btn-icon" disabled={i === it.stops.length - 1 || reorder.isPending} onClick={() => move(i, 1)} aria-label={t("itinerary.moveDown")}><Icon name="chevron-down" /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card card-flush">
          <div className="row-between" style={{ padding: 16, borderBottom: "1px solid var(--color-border)" }}>
            <h2 className="card-title" style={{ margin: 0 }}>{t("itinerary.actualVisits")} ({it.actual.length})</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => setUnexpectedOpen(true)}><Icon name="plus" /> {t("visit.addUnexpected")}</button>
          </div>
          {!it.actual.length ? (
            <EmptyState title={t("itinerary.noVisits")} text={t("itinerary.noVisitsHint")} />
          ) : (
            <ul className="list">
              {it.actual.map((a, i) => (
                <li key={a.uid} className="list-item" style={{ alignItems: "flex-start" }}>
                  <span className="mono" style={{ width: 24, color: a.kind === "UNEXPECTED" ? C_UNEXPECTED : C_ACTUAL, fontWeight: 700 }}>{i + 1}</span>
                  <div className="grow stack-sm" style={{ gap: 4 }}>
                    <Link href={`/places/${a.place.uid}`} className="title" style={{ color: "var(--color-primary)" }}>{a.place.name}</Link>
                    <span className="sub">{fmt.dateTime(a.visitedAt)}</span>
                    <div className="row">
                      <Stars value={a.rating} />
                      <VisitContextChip context={a.kind === "PLANNED" ? "PLANNED" : "UNEXPECTED"} />
                    </div>
                    {a.note && <span className="t-small" style={{ whiteSpace: "pre-wrap" }}>{a.note}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {editOpen && (
        <ItineraryForm
          title={t("itinerary.edit")}
          initial={{ name: it.name, description: it.description ?? "", startDate: it.startDate ?? "", endDate: it.endDate ?? "" }}
          busy={update.isPending}
          error={error}
          onClose={() => setEditOpen(false)}
          onSubmit={(v) => { setError(null); update.mutate({ uid, ...v }); }}
        />
      )}

      {delOpen && (
        <ConfirmDialog
          title={t("itinerary.deleteTitle")}
          message={<p style={{ margin: 0 }}>{t("itinerary.deleteText")}</p>}
          danger
          confirmLabel={t("common.delete")}
          busy={del.isPending}
          onClose={() => setDelOpen(false)}
          onConfirm={() => del.mutate({ uid })}
        />
      )}

      {addOpen && (
        <StopModal
          title={t("itinerary.addStop")}
          options={options.data ?? []}
          itineraryUid={uid}
          busy={addPlace.isPending}
          error={error}
          onClose={() => setAddOpen(false)}
          onSubmit={(v) => { setError(null); addPlace.mutate({ itineraryUid: uid, placeUid: v.placeUid, plannedDate: v.plannedDate, plannedTime: v.plannedTime, note: v.note }); }}
        />
      )}

      {editStop && (
        <StopModal
          title={t("itinerary.editStop")}
          options={[]}
          fixedName={editStop.place.name}
          initial={{ placeUid: editStop.place.uid, plannedDate: editStop.plannedDate ?? "", plannedTime: editStop.plannedTime?.slice(0, 5) ?? "", note: editStop.note ?? "" }}
          itineraryUid={uid}
          busy={updPlace.isPending}
          error={error}
          onClose={() => setEditStop(null)}
          onSubmit={(v) => { setError(null); updPlace.mutate({ uid: editStop.uid, plannedDate: v.plannedDate, plannedTime: v.plannedTime, note: v.note }); }}
        />
      )}

      {rmStop && (
        <ConfirmDialog
          title={t("itinerary.removeStopTitle")}
          message={<p style={{ margin: 0 }}>{t("itinerary.removeStopText", { name: rmStop.place.name })}</p>}
          danger
          confirmLabel={t("common.remove")}
          busy={rmPlace.isPending}
          onClose={() => setRmStop(null)}
          onConfirm={() => rmPlace.mutate({ uid: rmStop.uid })}
        />
      )}

      {unexpectedOpen && (
        <PickPlaceModal
          options={options.data ?? []}
          onClose={() => setUnexpectedOpen(false)}
          onPick={(placeUid) => { setUnexpectedOpen(false); setVisitFor({ placeUid }); }}
        />
      )}

      {visitFor && (
        <VisitFormModal
          placeUid={visitFor.placeUid}
          itineraryUid={uid}
          itineraryPlaceUid={visitFor.stopUid}
          onClose={() => setVisitFor(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

type PlaceOpt = { uid: string; name: string; address: string | null };

function StopModal({
  title,
  options,
  initial,
  fixedName,
  itineraryUid,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  title: string;
  options: PlaceOpt[];
  initial?: { placeUid: string; plannedDate: string; plannedTime: string; note: string };
  fixedName?: string;
  itineraryUid: string;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (v: { placeUid: string; plannedDate: string | null; plannedTime: string | null; note: string }) => void;
}) {
  const { t } = useT();
  const [placeUid, setPlaceUid] = useState(initial?.placeUid ?? "");
  const [q, setQ] = useState("");
  const [date, setDate] = useState(initial?.plannedDate ?? "");
  const [time, setTime] = useState(initial?.plannedTime ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const filtered = options.filter((o) => o.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <Modal
      title={title}
      onClose={onClose}
      actions={
        <>
          <button className="btn btn-secondary" onClick={onClose}>{t("common.cancel")}</button>
          <button className="btn btn-primary" disabled={busy || !placeUid} onClick={() => onSubmit({ placeUid, plannedDate: date || null, plannedTime: time || null, note })}>
            <Icon name="save" /> {busy ? t("common.processing") : t("common.save")}
          </button>
        </>
      }
    >
      <div className="stack">
        {error && <Alert kind="error">{error}</Alert>}
        {fixedName ? (
          <div><b>{fixedName}</b></div>
        ) : (
          <>
            <Field label={t("itinerary.pickPlace")} required htmlFor="stop-q">
              <input id="stop-q" className="input" placeholder={t("common.search")} value={q} onChange={(e) => setQ(e.target.value)} />
            </Field>
            <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid var(--color-border)", borderRadius: 8 }}>
              {filtered.length === 0 && <div className="empty" style={{ padding: 16 }}>{t("itinerary.noPlaceOptions")}</div>}
              {filtered.map((o) => (
                <button
                  key={o.uid}
                  type="button"
                  className="list-item"
                  aria-pressed={placeUid === o.uid}
                  style={{ width: "100%", border: 0, borderBottom: "1px solid var(--color-border)", background: placeUid === o.uid ? "var(--color-tint-active)" : "transparent", textAlign: "left", cursor: "pointer", font: "inherit" }}
                  onClick={() => setPlaceUid(o.uid)}
                >
                  <span className="grow"><span className="title">{o.name}</span><span className="sub" style={{ display: "block" }}>{o.address ?? "—"}</span></span>
                  {placeUid === o.uid && <Icon name="circle-check" />}
                </button>
              ))}
            </div>
            <p className="helper" style={{ margin: 0 }}>
              {t("itinerary.newPlaceHint")}{" "}
              <Link href={`/places/new?itinerary=${itineraryUid}`} style={{ color: "var(--color-primary)", fontWeight: 600 }}>{t("place.new")}</Link>
            </p>
          </>
        )}
        <div className="form-grid cols-2">
          <Field label={t("itinerary.plannedDate")} htmlFor="stop-d">
            <input id="stop-d" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label={t("itinerary.plannedTime")} htmlFor="stop-t">
            <input id="stop-t" className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>
        <Field label={t("itinerary.planNote")} htmlFor="stop-n" helper={t("itinerary.planNoteHint")}>
          <textarea id="stop-n" className="textarea" maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function PickPlaceModal({
  options,
  onPick,
  onClose,
}: {
  options: PlaceOpt[];
  onPick: (uid: string) => void;
  onClose: () => void;
}) {
  const { t } = useT();
  const [q, setQ] = useState("");
  const filtered = options.filter((o) => o.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <Modal title={t("visit.addUnexpected")} onClose={onClose} actions={<button className="btn btn-secondary" onClick={onClose}>{t("common.cancel")}</button>}>
      <div className="stack">
        <Alert kind="info">{t("visit.unexpectedNote")}</Alert>
        <input className="input" placeholder={t("common.search")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("common.search")} />
        <div style={{ maxHeight: 280, overflowY: "auto", border: "1px solid var(--color-border)", borderRadius: 8 }}>
          {filtered.length === 0 && <div className="empty" style={{ padding: 16 }}>{t("itinerary.noPlaceOptions")}</div>}
          {filtered.map((o) => (
            <button key={o.uid} type="button" className="list-item" style={{ width: "100%", border: 0, borderBottom: "1px solid var(--color-border)", background: "transparent", textAlign: "left", cursor: "pointer", font: "inherit" }} onClick={() => onPick(o.uid)}>
              <span className="grow"><span className="title">{o.name}</span><span className="sub" style={{ display: "block" }}>{o.address ?? "—"}</span></span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
