"use strict";

const $ = (sel) => document.querySelector(sel);
let currentJob = null;
let pollTimer = null;

async function api(path, opts) {
  const res = await fetch("/api" + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail || detail; } catch (_) {}
    throw new Error(detail);
  }
  return res.status === 204 ? null : res.json();
}

function toast(msg, isErr) {
  let el = $(".toast");
  if (!el) { el = document.createElement("div"); el.className = "toast"; document.body.appendChild(el); }
  el.textContent = msg;
  el.className = "toast show" + (isErr ? " err" : "");
  setTimeout(() => { el.className = "toast"; }, 2600);
}

// --------------------------------------------------------------------------- Jobs
async function loadJobs() {
  const jobs = await api("/jobs");
  const ul = $("#job-list");
  ul.innerHTML = "";
  if (!jobs.length) { ul.innerHTML = '<li class="muted">No jobs yet.</li>'; return; }
  for (const j of jobs) {
    const li = document.createElement("li");
    if (currentJob === j.id) li.classList.add("active");
    li.innerHTML = `<span><span class="jn">${escapeHtml(j.name)}</span>
      <span class="jm">#${j.id} · ${j.status}</span></span>
      <span class="jm">${escapeHtml(j.root_folder_id.slice(0, 10))}…</span>`;
    li.onclick = () => selectJob(j.id);
    ul.appendChild(li);
  }
}

$("#create-form").onsubmit = async (e) => {
  e.preventDefault();
  const name = $("#job-name").value.trim();
  const root_folder_id = $("#root-folder").value.trim();
  try {
    const job = await api("/jobs", { method: "POST", body: JSON.stringify({ name, root_folder_id }) });
    $("#job-name").value = ""; $("#root-folder").value = "";
    await loadJobs();
    selectJob(job.id);
    toast("Job created — now run a scan.");
  } catch (err) { toast(err.message, true); }
};

function selectJob(id) {
  currentJob = id;
  $("#detail").hidden = false;
  loadJobs();
  refresh();
  startPolling();
}

// --------------------------------------------------------------------------- Controls
$("#btn-scan").onclick  = () => act("/scan",  "Scanning Drive…");
$("#btn-start").onclick = () => act("/start", "Started.");
$("#btn-pause").onclick = () => act("/pause", "Pausing…");

async function act(suffix, msg) {
  if (!currentJob) return;
  try { await api(`/jobs/${currentJob}${suffix}`, { method: "POST" }); toast(msg); refresh(); }
  catch (err) { toast(err.message, true); }
}

// --------------------------------------------------------------------------- Refresh
async function refresh() {
  if (!currentJob) return;
  let d;
  try { d = await api(`/jobs/${currentJob}`); }
  catch (err) { toast(err.message, true); return; }

  const job = d.job;
  $("#detail-title").textContent = job.name;
  const badge = $("#status-badge");
  const label = d.running ? "running" : job.status;
  badge.textContent = label;
  badge.className = "badge " + label;

  const done = d.uploaded + d.failed + (d.counts.skipped || 0);
  const total = d.total_items || 0;
  const pct = total ? Math.round((done / total) * 100) : 0;
  $("#bar-fill").style.width = pct + "%";
  $("#progress-text").textContent = total
    ? `${d.uploaded} uploaded · ${done}/${total} processed (${pct}%)`
    : "No items yet — run a scan.";

  const order = ["ready", "uploading", "uploaded", "needs_review", "failed", "skipped", "pending"];
  $("#counts").innerHTML = order
    .filter((s) => d.counts[s])
    .map((s) => `<span class="chip">${s} <b>${d.counts[s]}</b></span>`)
    .join("") || '<span class="muted">—</span>';

  $("#btn-start").disabled = d.running;
  $("#btn-pause").disabled = !d.running;

  await Promise.all([loadQuestions(), loadFailures()]);
}

async function loadQuestions() {
  const qs = await api(`/jobs/${currentJob}/questions?status=open`);
  $("#q-count").textContent = qs.length;
  const box = $("#questions");
  if (!qs.length) { box.innerHTML = '<span class="muted">None — nothing needs your input.</span>'; return; }
  box.innerHTML = "";
  for (const q of qs) box.appendChild(renderQuestion(q));
}

function renderQuestion(q) {
  const div = document.createElement("div");
  div.className = "q" + (q.blocking ? " blocking" : "");
  const prompt = document.createElement("div");
  prompt.className = "prompt";
  prompt.textContent = q.prompt;
  div.appendChild(prompt);

  const row = document.createElement("div");
  row.className = "qrow";

  if (q.kind === "year") {
    const input = el("input", { type: "number", placeholder: "Year", min: "1826", max: "2100" });
    const ok = el("button", { textContent: "Set year" });
    const skip = el("button", { textContent: "Can't recall — use file dates", className: "ghost" });
    ok.onclick = () => answer(q.id, { year: parseInt(input.value, 10) });
    skip.onclick = () => answer(q.id, { skip: true });
    row.append(input, ok, skip);
  } else {
    const lat = el("input", { type: "number", placeholder: "Latitude", step: "any" });
    const lng = el("input", { type: "number", placeholder: "Longitude", step: "any" });
    const ok = el("button", { textContent: "Set location" });
    const none = el("button", { textContent: "No location", className: "ghost" });
    ok.onclick = () => answer(q.id, { lat: parseFloat(lat.value), lng: parseFloat(lng.value) });
    none.onclick = () => answer(q.id, { none: true });
    row.append(lat, lng, ok, none);
  }
  div.appendChild(row);
  return div;
}

async function answer(qid, payload) {
  try {
    const r = await api(`/questions/${qid}/answer`, { method: "POST", body: JSON.stringify(payload) });
    toast(r.promoted_items ? `Answered — ${r.promoted_items} photos ready.` : "Answered.");
    refresh();
  } catch (err) { toast(err.message, true); }
}

async function loadFailures() {
  const fails = await api(`/jobs/${currentJob}/items?status=failed&limit=20`);
  const box = $("#failures");
  if (!fails.length) { box.innerHTML = '<span class="muted">None.</span>'; return; }
  box.innerHTML = fails
    .map((f) => `<div class="fail"><span class="fn">${escapeHtml(f.name)}</span> —
      <span class="fe">${escapeHtml(f.error || "unknown error")}</span></div>`)
    .join("");
}

// --------------------------------------------------------------------------- Polling
function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(refresh, 2000);
}

// --------------------------------------------------------------------------- helpers
function el(tag, props) { return Object.assign(document.createElement(tag), props); }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

loadJobs();
