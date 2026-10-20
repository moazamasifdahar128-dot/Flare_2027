// @ts-nocheck
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Play, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { TopBack } from "@/components/flare/page";
import { GIG_LIMIT_BODY, GIG_LIMIT_TITLE, LimitModal } from "@/components/shola/limit-modal";
import { Phone, errText } from "@/components/shola/shell";
import { contactLeak, containsContactInfo, leakNote, trimWords, whatsappDigits, whatsappOk, wordCount } from "@/lib/shola/gig-text";
import { LeakMark } from "@/components/shola/leak-mark";
import { compressGigPhoto, playableMedia, seizeFile, stageGigVideo } from "@/lib/shola/gig-upload";
import { openClipSlot } from "@/lib/shola/gig-slots";
import { deleteGig, gigDeletePreview, gigOne, saveGig, updateGig } from "@/lib/shola/gigs";
import { listingQuota } from "@/lib/shola/profile-desk";
import { useI18n } from "@/lib/shola/i18n";

export const Route = createFileRoute("/gigs/new")({
  validateSearch: (search: Record<string, unknown>) => ({
    edit: typeof search.edit === "string" ? search.edit.slice(0, 80) : "",
  }),
  component: NewGig,
});

function createHead(used: number, max: number, noun: string) {
	const cap = max || 3;
	const slot = Math.min((Number(used) || 0) + 1, cap);
	return slot >= cap ? `Creating ${noun} ${cap}/${cap} - Last slot` : `Creating ${noun} ${slot}/${cap}`;
}
var CATS = [
	"AI Video",
	"Editing",
	"Duet",
	"Logo",
	"Animation"
];
function NewGig() {
	const { t } = useI18n();
	const navigate = useNavigate();
	const { edit } = Route.useSearch();
	const photosRef = useRef(null);
	const slotRef0 = useRef(null);
	const slotRef1 = useRef(null);
	const [pickerGen, setPickerGen] = useState([0, 0]);
	const dropped = useRef(new Set());
	const slotBusy = useRef([false, false]);
	const [title, setTitle] = useState("");
	const [body, setBody] = useState("");
	const [price, setPrice] = useState("5");
	const [days, setDays] = useState("1-3 Days");
	const [photos, setPhotos] = useState([]);
	const [clips, setClips] = useState([]);
	const [category, setCategory] = useState("Editing");
	const [hideCounts, setHideCounts] = useState(false);
	const [whatsapp, setWhatsapp] = useState("");
	const [adminNote, setAdminNote] = useState("");
	const [gate, setGate] = useState(edit ? "wait" : "open");
	const [preparing, setPreparing] = useState(false);
	const [error, setError] = useState("");
	const [titleAlert, setTitleAlert] = useState(false);
	const [bodyAlert, setBodyAlert] = useState(false);
	const [photoAlert, setPhotoAlert] = useState(false);
	const [photoPulse, setPhotoPulse] = useState(false);
	const [online, setOnline] = useState(true);
	const [phoneTried, setPhoneTried] = useState(false);
	const titleTimer = useRef(0);
	const bodyTimer = useRef(0);
	const photoBox = useRef(null);
	const [videoNote, setVideoNote] = useState("");
	const [busy, setBusy] = useState(false);
	const [quota, setQuota] = useState({
		gigs: 0,
		gigMax: 3,
		username: ""
	});
	const [blocked, setBlocked] = useState(false);
	const [drop, setDrop] = useState(null);
	const [checked, setChecked] = useState(Boolean(edit));
	const full = !edit && quota.gigs >= quota.gigMax;
	const titleWords = wordCount(title);
	const bodyWords = wordCount(body);
	const titleOk = title.trim().length > 0 && (titleWords >= 3 || title.trim().length >= 10) && title.length <= 80;
	const bodyOk = bodyWords >= 20 && bodyWords <= 400;
	const phoneDigits = whatsappDigits(whatsapp);
	const phoneBad = phoneDigits.length > 0 && !whatsappOk(whatsapp);
	const titleLeak = containsContactInfo(title);
	const bodyLeak = containsContactInfo(body);
	const ready = titleOk && bodyOk && !phoneBad && !titleLeak && !bodyLeak && photos.length >= 1 && !preparing;
	function ping(setter, timer, ms) {
		setter(true);
		window.clearTimeout(timer.current);
		timer.current = window.setTimeout(() => setter(false), ms);
	}
	function takeTitle(raw) {
		if (raw.length > 80) {
			setTitle(raw.slice(0, 80));
			ping(setTitleAlert, titleTimer, 3000);
			return;
		}
		setTitle(raw);
	}
	function takeBody(raw) {
		const clipped = raw.length > 2000 ? raw.slice(0, 2000) : raw;
		const trimmed = trimWords(clipped, 400);
		if (wordCount(clipped) > 400 || raw.length > 2000) {
			setBody(trimmed);
			ping(setBodyAlert, bodyTimer, 4000);
			return;
		}
		setBody(raw);
	}
	useEffect(() => {
		listingQuota().then((row) => {
			const gigs = Number(row?.gigs) || 0;
			const gigMax = Number(row?.gigMax) || 3;
			setQuota({ gigs, gigMax, username: String(row?.username || "") });
			if (!edit && gigs >= gigMax) setBlocked(true);
		}).catch(() => void 0).finally(() => setChecked(true));
	}, [edit]);
	useEffect(() => {
		const sync = () => setOnline(typeof navigator === "undefined" ? true : navigator.onLine);
		sync();
		window.addEventListener("online", sync);
		window.addEventListener("offline", sync);
		return () => {
			window.removeEventListener("online", sync);
			window.removeEventListener("offline", sync);
		};
	}, []);
	useEffect(() => {
		if (!edit) return;
		gigOne({ data: edit }).then((row) => {
			if (!row) {
				navigate({ to: "/gigs" });
				return;
			}
			if (!row.canEdit) {
				navigate({
					to: "/gigs/$id",
					params: { id: edit }
				});
				return;
			}
			setTitle(row.title);
			setBody(row.body);
			setPrice(String(row.priceUsd));
			setDays(row.days);
			setCategory(CATS.includes(row.category) ? row.category : "Editing");
			setHideCounts(row.hideCounts);
			setWhatsapp(String(row.whatsapp || "").replace(/\D/g, "").slice(0, 15));
			setAdminNote(row.adminEdit);
			const stored = row.photoCount || 0;
			const count = stored > 0 ? stored : Math.max(row.slides.length, row.thumb ? 1 : 0);
			setPhotos(Array.from({ length: count }, (_, index) => ({
				key: `keep-${index}`,
				keep: stored > 0 ? index : null,
				full: stored > 0 ? "" : row.slides[index] || row.thumb || "",
				thumb: row.slides[index] || (index === 0 ? row.thumb : "")
			})));
			setClips(row.videos.map((url, slot) => ({
				key: url,
				slot,
				poster: "",
				url,
				pct: 100
			})));
			setGate("open");
		}).catch((err) => {
			setError(errText(err, t));
			setGate("open");
		});
	}, [edit]);
	async function addPhotos(list) {
		const picked = [...list ?? []].slice(0, 3 - photos.length);
		if (!picked.length) return;
		const seized = picked.map((file) => seizeFile(file));
		setPreparing(true);
		setError("");
		try {
			const next = [];
			for (const pending of seized) {
				let file;
				try {
					file = await pending;
				} catch (err) {
					if (err instanceof Error && err.message === "GIG_READ") throw new Error("GIG_PHOTO");
					throw err;
				}
				const shot = await compressGigPhoto(file);
				next.push({
					key: crypto.randomUUID(),
					keep: null,
					full: shot.full,
					thumb: shot.thumb
				});
			}
			setPhotos((cur) => [...cur, ...next].slice(0, 3));
			setPhotoAlert(false);
		} catch (err) {
			setError(errText(err, t));
		} finally {
			if (photosRef.current) photosRef.current.value = "";
			setPreparing(false);
		}
	}
	function slotInput(slot) {
		return slot === 0 ? slotRef0.current : slotRef1.current;
	}
	function releaseSlotInput(slot) {
		const node = slotInput(slot);
		if (node) node.value = "";
		setPickerGen((cur) => {
			const next = [cur[0], cur[1]];
			next[slot] = cur[slot] + 1;
			return next;
		});
	}
	async function addVideos(slot, list) {
		const original = list?.[0];
		if (!original) return;
		if (slotBusy.current[slot]) return;
		if (clips.some((clip) => !clip.url) || clips.some((clip) => clip.slot === slot) || openClipSlot(clips.map((clip) => clip.slot)) < 0) {
			const node = slotInput(slot);
			if (node) node.value = "";
			if (clips.some((clip) => !clip.url)) setVideoNote("Please select and upload sample videos one at a time.");
			return;
		}
		slotBusy.current[slot] = true;
		const pending = seizeFile(original);
		const key = crypto.randomUUID();
		setClips((cur) => {
			if (cur.some((clip) => clip.slot === slot) || cur.length >= 2) return cur;
			return [...cur, {
				key,
				slot,
				poster: "",
				url: "",
				pct: 1
			}];
		});
		let preview = "";
		try {
			const file = await pending;
			releaseSlotInput(slot);
			if (file.size < 1) throw new Error("GIG_READ");
			preview = URL.createObjectURL(file);
			setClips((cur) => cur.map((item) => item.key === key ? {
				...item,
				poster: preview
			} : item));
			const result = await stageGigVideo(file, (pct) => {
				setClips((cur) => cur.map((item) => item.key === key ? {
					...item,
					pct
				} : item));
			}, () => dropped.current.has(key));
			if (result.poster && result.poster !== preview) URL.revokeObjectURL(preview);
			setClips((cur) => cur.map((item) => item.key === key ? {
				...item,
				url: result.url,
				poster: result.poster || preview,
				pct: 100
			} : item));
		} catch (err) {
			if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
			const message = err instanceof Error ? err.message : "";
			setClips((cur) => cur.filter((item) => item.key !== key));
			if (message === "GIG_CANCEL") return;
			setVideoNote(errText(err, t));
		} finally {
			slotBusy.current[slot] = false;
		}
	}
	return jsxs(Phone, { children: [jsxs("form", {
		className: "px-4 pt-4 pb-10",
		style: { touchAction: "pan-x pan-y" },
		onSubmit: (e) => {
			e.preventDefault();
			if (busy) return;
			if (!ready) {
				if (titleLeak) setError("Remove phone numbers, WhatsApp, links, emails, social handles from title. Use Flare chat only. Delete to save.");
				else if (bodyLeak) setError("Remove phone numbers, WhatsApp, links, emails, social handles from description. Use Flare chat only. Delete to save.");
				else if (!titleOk) setError("A title needs at least 3 words or 10 characters.");
				else if (!bodyOk) setError(bodyWords > 0 && bodyWords < 20 ? "Description too short (min 20 words)" : "A description needs at least 20 words, and at most 400 words.");
				else setError("");
				if (phoneBad) setPhoneTried(true);
				if (photos.length < 1) {
					setPhotoAlert(true);
					setPhotoPulse(true);
					window.setTimeout(() => setPhotoPulse(false), 2000);
					photoBox.current?.scrollIntoView({ behavior: "smooth", block: "center" });
				}
				return;
			}
			setError("");
			setPhotoAlert(false);
			if (!edit && quota.gigs >= quota.gigMax) {
				setBlocked(true);
				return;
			}
			if (clips.some((clip) => !clip.url)) setVideoNote("Publishing with your photos. A video that is not ready was left off.");
			setBusy(true);
			const payload = {
				title,
				body,
				priceUsd: Number(price) || 1,
				days,
				photos: edit ? [] : photos.map((shot) => shot.full),
				videos: clips.filter((clip) => clip.url).map((clip) => clip.url),
				thumb: photos[0]?.thumb ?? "",
				slides: photos.map((shot) => shot.thumb).filter((item) => item.startsWith("data:image/")),
				category,
				hideCounts,
				whatsapp,
				photoPlan: edit ? photos.map((shot) => shot.keep == null ? {
					full: shot.full,
					thumb: shot.thumb
				} : { keep: shot.keep }) : []
			};
			(edit ? updateGig({ data: {
				id: edit,
				...payload
			} }) : saveGig({ data: payload })).then(async (row) => {
				if (edit) {
					navigate({
						to: "/gigs/$id",
						params: { id: row.id }
					});
					return;
				}
				try {
					sessionStorage.setItem("flare_toast", "Gig published");
				} catch {}
				navigate({ to: "/" });
			}).catch((err) => {
				if ((err instanceof Error ? err.message : String(err ?? "")).includes("LIMIT_REACHED") || (err instanceof Error ? err.message : String(err ?? "")).includes("GIG_LIMIT")) setBlocked(true);
				else setError(errText(err, t));
			}).finally(() => setBusy(false));
		},
		children: [
			jsxs("div", {
				className: "flex items-center justify-between",
				children: [
					jsx(TopBack, {}),
					jsx("h1", {
						className: "text-base font-semibold",
						children: edit ? "Edit gig" : createHead(quota.gigs, quota.gigMax, "Gig")
					}),
					jsx("button", {
						type: "button",
						"aria-label": "Close",
						className: "grid size-10 place-items-center",
						onClick: () => navigate({ to: "/gigs" }),
						children: jsx(X, { className: "size-5" })
					})
				]
			}),
			jsxs("p", {
				className: "mt-3 text-sm font-semibold",
				children: [
					"Active Gigs: ",
					Math.min(quota.gigs, quota.gigMax),
					"/",
					quota.gigMax
				]
			}),
			jsx("p", {
				className: "text-xs text-white/50",
				children: "Gigs remain active until deleted."
			}),
			(gate === "wait" || (!edit && !checked)) && jsxs("div", {
				className: "mt-4 animate-pulse space-y-3",
				children: [
					jsx("div", { className: "h-11 rounded-xl bg-white/10" }),
					jsx("div", { className: "h-28 rounded-xl bg-white/10" }),
					jsx("div", { className: "h-40 rounded-2xl bg-white/10" })
				]
			}),
			gate === "open" && checked && !full && jsxs(Fragment, { children: [
				adminNote && jsx("p", {
					className: "mt-3 text-xs text-muted",
					children: adminNote
				}),
				jsxs("label", {
					className: "mt-4 block text-sm",
					children: [
						"Title",
						jsx(LeakMark, {
							value: title,
							maxLength: 80,
							onChange: (next) => takeTitle(next),
							onPaste: (e) => {
								const pasted = e.clipboardData.getData("text");
								const start = e.currentTarget.selectionStart ?? title.length;
								const end = e.currentTarget.selectionEnd ?? title.length;
								const merged = title.slice(0, start) + pasted + title.slice(end);
								if (merged.length > 80) {
									e.preventDefault();
									takeTitle(merged);
								}
							},
							onKeyDown: (e) => {
								if (title.length >= 80 && e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) ping(setTitleAlert, titleTimer, 3000);
							},
							minClass: "min-h-24",
							bad: titleLeak,
							placeholder: "I will record a professional duet"
						}),
						jsx("span", {
							className: `text-xs ${title.length >= 80 ? "font-semibold text-[#FF3B30]" : title.length >= 70 ? "text-[#FF3B30]" : "text-white/45"}`,
							children: `${title.length}/80 characters`
						}),
						titleAlert && jsx("span", {
							className: "mt-1 block text-xs font-semibold text-[#FF3B30]",
							children: "Title limit reached (80 chars max). Extra text trimmed."
						}),
						jsx("span", {
							className: `text-xs ${titleOk ? "text-emerald-400" : "text-white/45"}`,
							children: titleOk ? "Looks good" : `${titleWords} words - at least 3 words or 10 characters`
						}),
						titleLeak && jsx("span", {
							className: "mt-1 block text-xs font-semibold text-[#FF3B30]",
							children: leakNote(title)
						})
					]
				}),
				jsxs("label", {
					className: "mt-4 block text-sm",
					children: [
						"Description",
						jsx(LeakMark, {
							value: body,
							onChange: (next) => takeBody(next),
							onPaste: (e) => {
								const pasted = e.clipboardData.getData("text");
								const start = e.currentTarget.selectionStart ?? body.length;
								const end = e.currentTarget.selectionEnd ?? body.length;
								const merged = body.slice(0, start) + pasted + body.slice(end);
								if (wordCount(merged) > 400 || merged.length > 2000) {
									e.preventDefault();
									takeBody(merged);
								}
							},
							minClass: "min-h-40",
							bad: bodyLeak
						}),
						jsx("span", {
							className: `text-xs ${bodyWords >= 400 ? "font-semibold text-[#FF3B30]" : bodyWords >= 350 ? "text-orange-400" : bodyWords > 0 ? "text-emerald-400" : "text-white/45"}`,
							children: `${bodyWords}/400 words`
						}),
						bodyAlert && jsx("span", {
							className: "mt-1 block text-xs font-semibold text-[#FF3B30]",
							children: "Description limit reached (400 words max). Extra words trimmed."
						}),
						jsx("span", {
							className: `text-xs ${bodyOk ? "text-emerald-400" : "text-white/45"}`,
							children: bodyOk ? "Looks good" : bodyWords > 0 && bodyWords < 20 ? "Description too short (min 20 words)" : `${bodyWords} words - at least 20 words, up to 400`
						}),
						bodyLeak && jsx("span", {
							className: "mt-1 block text-xs font-semibold text-[#FF3B30]",
							children: leakNote(body)
						})
					]
				}),
				jsxs("label", {
					className: "mt-4 block text-sm",
					children: [
						"WhatsApp number (optional)",
						jsx("input", {
							value: whatsapp,
							onChange: (e) => {
								const next = e.target.value.replace(/[^\d+\s().-]/g, "");
								setWhatsapp(whatsappDigits(next).length > 15 ? whatsapp : next.slice(0, 22));
								setPhoneTried(false);
							},
							onBlur: () => { if (whatsapp) setPhoneTried(true); },
							inputMode: "numeric",
							placeholder: "+49 151 12345678 or 923001234567",
							className: `mt-1 h-12 w-full rounded-xl bg-surface px-3 text-base ${phoneTried && phoneBad ? "ring-1 ring-[#FF3B30]" : ""}`
						}),
						jsx("span", {
							className: "text-xs text-muted",
							children: "Optional. Leave empty if you want buyers to contact you only via Flare in-app chat. If added, your number stays masked until someone pays to unlock."
						}),
						phoneTried && phoneBad && jsx("span", {
							className: "mt-1 block text-xs font-semibold text-[#FF3B30]",
							children: "Enter valid WhatsApp number (7-15 digits, any country)"
						})
					]
				}),
				jsxs("div", {
					className: "mt-4 grid grid-cols-2 gap-3",
					children: [jsxs("label", {
						className: "text-sm",
						children: ["Starting price", jsx("input", {
							value: price,
							onChange: (e) => setPrice(e.target.value.replace(/[^\d]/g, "")),
							inputMode: "numeric",
							className: "mt-1 h-11 w-full rounded-xl bg-surface px-3 text-base"
						})]
					}), jsxs("label", {
						className: "text-sm",
						children: ["Delivery", jsx("input", {
							value: days,
							onChange: (e) => setDays(e.target.value),
							className: "mt-1 h-11 w-full rounded-xl bg-surface px-3 text-base"
						})]
					})]
				}),
				jsxs("div", {
					className: "mt-4",
					children: [jsx("p", {
						className: "text-sm",
						children: "Category"
					}), jsx("div", {
						className: "mt-2 flex gap-2 overflow-x-auto no-scrollbar",
						children: CATS.map((item) => jsx("button", {
							type: "button",
							onClick: () => setCategory(item),
							className: `h-8 shrink-0 rounded-full px-3 text-xs font-semibold ${category === item ? "bg-white text-black" : "bg-surface text-white/80"}`,
							children: item
						}, item))
					})]
				}),
				jsxs("button", {
					type: "button",
					role: "switch",
					"aria-checked": hideCounts,
					className: "mt-4 flex w-full items-center justify-between gap-3 rounded-xl bg-surface px-3 py-3 text-left text-sm",
					onClick: () => setHideCounts((v) => !v),
					children: [jsx("span", { children: "Hide Like & View Counts on this Gig" }), jsx("span", {
						className: `relative h-6 w-11 shrink-0 rounded-full ${hideCounts ? "bg-cyan-400" : "bg-white/20"}`,
						children: jsx("span", { className: `absolute top-0.5 size-5 rounded-full bg-white ${hideCounts ? "right-0.5" : "left-0.5"}` })
					})]
				}),
				jsxs("div", {
					ref: photoBox,
					className: `mt-4 rounded-xl ${photoAlert ? "ring-1 ring-[#EF4444] p-2" : ""} ${photoPulse ? "animate-pulse" : ""}`,
					children: [
						jsx("p", {
							className: "text-sm",
							children: "Sample photos (1 to 3, minimum 1 required)"
						}),
						photoAlert ? jsx("p", {
							className: "mt-2 rounded-xl bg-[#2D0000] px-3 py-2 text-xs font-semibold text-[#EF4444]",
							children: "Please upload at least 1 sample photo to publish your Gig"
						}) : null,
						jsx("input", {
							ref: photosRef,
							type: "file",
							accept: "image/*",
							multiple: true,
							className: "sr-only",
							onChange: (e) => void addPhotos(e.target.files)
						}),
						jsx("button", {
							type: "button",
							disabled: photos.length >= 3 || preparing,
							className: `mt-2 h-10 rounded-lg bg-surface px-4 text-sm disabled:opacity-40 ${photoPulse ? "ring-2 ring-[#EF4444]" : ""}`,
							onClick: () => photosRef.current?.click(),
							children: "Add photos"
						}),
						preparing && jsx("p", {
							className: "mt-2 text-xs text-muted",
							children: "Preparing photo…"
						}),
						jsx("div", {
							className: "mt-3 flex gap-2",
							children: [0, 1, 2].map((slot) => {
								const shot = photos[slot];
								if (!shot) return jsx("div", {
									className: "grid h-28 w-20 place-items-center rounded-lg bg-white/10 text-[10px] text-white/35",
									children: "Photo"
								}, `empty-${slot}`);
								return jsxs("div", {
									className: "relative grid h-28 w-20 place-items-center overflow-hidden rounded-lg bg-white/10",
									children: [shot.thumb ? jsx("img", {
										src: shot.thumb,
										alt: "",
										decoding: "async",
										className: "max-h-full max-w-full object-contain"
									}) : jsx("span", {
										className: "text-[10px] text-white/50",
										children: "Photo"
									}), jsx("button", {
										type: "button",
										"aria-label": "Remove photo",
										className: "absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-black/75 text-xs text-white",
										onClick: () => setPhotos((cur) => cur.filter((item) => item.key !== shot.key)),
										children: "×"
									})]
								}, shot.key);
							})
						})
					]
				}),
				jsxs("div", {
					className: "mt-4",
					children: [
						jsx("p", {
							className: "text-sm",
							children: "Sample videos (optional, up to 2)"
						}),
						jsx("input", {
							ref: slotRef0,
							type: "file",
							accept: "video/mp4,video/quicktime,video/3gpp,video/webm,.mp4,.mov,.3gp,.webm",
							className: "sr-only",
							onChange: (e) => void addVideos(0, e.target.files)
						}, `slot-0-${pickerGen[0]}`),
						jsx("input", {
							ref: slotRef1,
							type: "file",
							accept: "video/mp4,video/quicktime,video/3gpp,video/webm,.mp4,.mov,.3gp,.webm",
							className: "sr-only",
							onChange: (e) => void addVideos(1, e.target.files)
						}, `slot-1-${pickerGen[1]}`),
						jsx("button", {
							type: "button",
							disabled: clips.length >= 2 || clips.some((clip) => !clip.url),
							className: "mt-2 h-10 rounded-lg bg-surface px-4 text-sm disabled:opacity-40",
							onClick: () => {
								const slot = openClipSlot(clips.map((clip) => clip.slot));
								if (slot >= 0) slotInput(slot)?.click();
							},
							children: "Add videos"
						}),
						jsx("p", {
							className: "mt-3 rounded-xl border border-white/10 bg-[#16161E] px-3 py-2 text-xs leading-5 text-white/80",
							children: "Max 2 clips (Up to 30 seconds each, Max 60MB each, 1080p max). Auto compressed in browser for fast upload, high quality kept."
						}),
						jsx("div", {
							className: "mt-3 space-y-3",
							children: clips.map((clip, index) => jsxs("div", {
								className: "relative overflow-hidden rounded-xl bg-black",
								children: [
									clip.url ? jsx("video", {
										src: playableMedia(clip.url),
										poster: clip.poster.startsWith("data:") ? clip.poster : void 0,
										controls: true,
										muted: true,
										playsInline: true,
										preload: "metadata",
										className: "max-h-40 w-full object-contain"
									}) : clip.poster.startsWith("blob:") ? jsx("video", {
										src: clip.poster,
										muted: true,
										playsInline: true,
										preload: "metadata",
										className: "max-h-40 w-full object-contain"
									}) : clip.poster ? jsx("img", {
										src: clip.poster,
										alt: "",
										decoding: "async",
										className: "max-h-40 w-full object-contain"
									}) : jsx("div", {
										className: "grid h-24 place-items-center bg-[#16161E] text-xs text-white/60",
										children: "Sample"
									}),
									(clip.poster || clip.url) && jsx("span", {
										className: "pointer-events-none absolute bottom-2 left-2 grid size-8 place-items-center rounded-full bg-black/70 text-white",
										children: jsx(Play, { className: "size-4 fill-white" })
									}),
									clip.pct < 100 && !clip.url && jsxs("div", {
										className: "pointer-events-none absolute inset-0 z-10 grid place-items-center bg-black/45 text-xs text-white",
										children: [
											!online ? `Network lost. Upload paused at ${clip.pct}%. It will continue when the connection returns.` : `Uploading video ${index + 1}/2 - ${clip.pct}%`
										]
									}),
									clip.pct < 100 && jsxs("div", {
										className: "absolute inset-x-3 bottom-3 z-10",
										children: [jsxs("p", {
											className: "mb-1 text-right text-[11px] text-white",
											children: [clip.pct, "%"]
										}), jsx("div", {
											className: "h-1 overflow-hidden rounded-full bg-white/20",
											children: jsx("div", {
												className: "h-full bg-gradient-to-r from-cyan-400 to-pink-500",
												style: { width: `${clip.pct}%` }
											})
										})]
									}),
									jsx("button", {
										type: "button",
										"aria-label": "Remove video",
										className: "absolute top-1 right-1 z-20 grid size-5 place-items-center rounded-full bg-black/75 text-xs text-white",
										onClick: () => {
											dropped.current.add(clip.key);
											if (clip.poster.startsWith("blob:")) URL.revokeObjectURL(clip.poster);
											setClips((cur) => cur.filter((item) => item.key !== clip.key));
										},
										children: "×"
									})
								]
							}, clip.key))
						}),
						videoNote && jsx("p", {
							className: "mt-2 rounded-xl bg-danger/15 px-3 py-2 text-sm text-danger",
							children: videoNote
						})
					]
				}),
				error && jsx("p", {
					className: "mt-3 text-sm text-danger",
					children: error
				}),
				jsx("button", {
					type: "submit",
					disabled: busy || !ready,
					className: "mt-5 h-12 w-full rounded-xl bg-gradient-to-r from-cyan-400 to-pink-500 font-semibold text-black disabled:opacity-40",
					children: busy ? "Saving…" : edit ? "Save Changes" : "Publish Gig"
				}),
				edit && jsx("button", {
					type: "button",
					className: "mt-3 h-11 w-full text-sm text-danger",
					onClick: () => {
						setError("");
						gigDeletePreview({ data: edit }).then((row) => {
							setDrop(row || { thisGigViews: 0, totalBefore: 0, totalAfter: 0, hadTick: false });
						}).catch((err) => setError(errText(err, t)));
					},
					children: "Delete gig"
				})
			] })
		]
	}), drop && jsx("div", {
		className: "fixed inset-0 z-[80] grid place-items-center bg-black/75 px-5",
		role: "dialog",
		"aria-modal": "true",
		children: jsxs("div", {
			className: "w-full max-w-sm rounded-3xl border border-white/10 bg-[#14141c] p-5 shadow-2xl",
			children: [
				jsx("p", { className: "text-lg font-semibold", children: "Delete Gig?" }),
				jsx("p", {
					className: "mt-2 whitespace-pre-line text-sm leading-6 text-white/70",
					children: `This Gig has ${Number(drop.thisGigViews) || 0} Views. If you delete it, your total Views will go from ${Number(drop.totalBefore) || 0} to ${Number(drop.totalAfter) || 0}. Your Views will be permanently removed with this Gig.\nIf your total Views go below 2000, your Blue Tick will be automatically removed.\nAre you sure?`
				}),
				jsxs("div", {
					className: "mt-5 grid gap-2",
					children: [
						jsx("button", {
							type: "button",
							disabled: busy,
							className: "h-11 rounded-xl bg-[#FF4D2E] text-sm font-semibold text-white disabled:opacity-40",
							onClick: () => {
								setBusy(true);
								deleteGig({ data: edit }).then((row) => {
									const totalAfter = Number(row?.totalAfter) || 0;
									let text = "Gig deleted.";
									if (row?.tickRemoved) text = "Gig deleted. Total views below 2000 - Blue Tick removed.";
									else if (row?.hadTick && totalAfter >= 2000) text = "Gig deleted. Blue Tick remains as views are still above 2000.";
									try { sessionStorage.setItem("flare_toast", text); } catch {}
									navigate({ to: "/gigs" });
								}).catch((err) => {
									setError(errText(err, t));
									setBusy(false);
									setDrop(null);
								});
							},
							children: "Yes, Delete Permanently"
						}),
						jsx("button", {
							type: "button",
							className: "h-11 rounded-xl bg-white/10 text-sm font-semibold",
							onClick: () => setDrop(null),
							children: "Cancel"
						})
					]
				})
			]
		})
	}), jsx(LimitModal, {
		open: blocked,
		title: GIG_LIMIT_TITLE,
		body: GIG_LIMIT_BODY,
		manageLabel: "Go to My Gigs",
		onManage: () => {
			try {
				sessionStorage.setItem("flare_profile_tab", "gigs");
			} catch {}
			if (quota.username) navigate({
				to: "/u/$username",
				params: { username: quota.username }
			});
		},
		onClose: () => {
			if (full) {
				navigate({ to: "/gigs" });
				return;
			}
			setBlocked(false);
		}
	})] });
}
