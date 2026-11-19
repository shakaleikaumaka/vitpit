# 🛠️ The P.I.T. Pipeline

The **real working scripts** that built the Esmeralda P.I.T. — not cleaned up
for show, but the actual loop that crawled, harvested, audited, and published
149 sessions in days, for ≈ \$0. Copyleft. Fork freely.

## The flow

```
crawl → harvest → audit → publish
```

| Stage | Scripts | What they do |
|---|---|---|
| **Crawl** | `crawl.sh` | Inventory the source drives: IDs, titles, dates, sizes → `catalog-raw.json` |
| **Harvest** | `fetch-loop.sh` · `fetch-one.sh` | Resilient download loop (one item / endless retry passes) |
| | `worker.sh` · `worker-v2.sh` · `worker-vfull.sh` | Shard workers: download → convert video→audio → upload to Internet Archive |
| | `supervisor.sh` | Keeps N shard workers alive until every slug has an archive node URL |
| | `retry-loop.sh` · `watchdog.sh` | Extra passes over stragglers; relaunch dead workers |
| | `rclone-worker.sh` · `whale-worker.sh` · `whale-streamer.sh` · `local-worker.sh` | Heavy-file ("whale") handling via rclone, disk-budgeted, streaming |
| | `downconvert-rest.sh` | Squeeze remaining big files to listenable bitrates |
| **Audit** | `patch-catalog.py` · `update-catalog.py` | Verify durations/bitrates, patch catalog with ground truth |
| | `build-map-from-ia.py` | Rebuild slug → archive.org node URL map from IA metadata |
| **Publish** | `upload-to-archive.sh` · `upload-staged.sh` | Push staged audio to the Internet Archive (S3 API) |

## Configuration

Everything secret is **environment-only**:

```bash
export IA_ACCESS="your-ia-s3-access-key"   # archive.org/account/s3.php
export IA_SECRET="your-ia-s3-secret-key"
```

The scripts were built for Google Drive sources via `rclone`, but the pattern
(crawl → shard → supervise → upload → map) ports to any source.

## Honest notes

- These are battle scripts, written mid-harvest. Paths like `/tmp/audio-staging`
  are hardcoded — treat them as a reference implementation, not a library.
- The Internet Archive is the canonical long-term home for the audio. The live
  site also serves `/audio/` locally for seek-friendly playback (see `../sw.js`
  for the range-shim trick that makes seeking work on static hosting).
- Expected failure modes are handled (network drops, disk pressure, dead
  workers) — that's what the supervisor/retry layers are for. Run it, walk
  away, come back to a full pit.

**The pit provides.** 💪🕳️
