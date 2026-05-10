// ngrok-style live dashboard for piggyback (server and client share this).
//
// In a TTY: clears + redraws the screen on each event/tick, showing a banner,
//          info block, live counters, and a recent-events log.
// In a pipe / non-TTY (Docker logs, redirected output): falls back to plain
//          structured per-line logging.
//
// Set PIGGY_LOG=plain to force plain mode.

const fs = require("fs");
const path = require("path");
const chalk = require("chalk");

const VERSION = require("../package.json").version;
const LOGO = fs.readFileSync(path.join(__dirname, "logo.txt"), "utf8").replace(/\n$/, "").split("\n");

const fmtBytes = (n) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
};

const fmtDuration = (ms) => {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return `${m}m ${rs}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
};

const nowHHMMSS = () => new Date().toTimeString().slice(0, 8);

class Dashboard {
  constructor(role, info = {}) {
    this.role = role;
    this.info = info;
    this.events = [];
    this.maxEvents = 4;
    this.metrics = { totalConns: 0, activeConns: 0, bytesIn: 0, bytesOut: 0 };
    this.startedAt = Date.now();
    this.status = "starting";
    this.tty = process.stdout.isTTY && process.env.PIGGY_LOG !== "plain";
    this.timer = null;
    this._renderScheduled = false;
  }

  start() {
    if (this.tty) {
      this._render();
      this.timer = setInterval(() => this._render(), 1000);
    } else {
      for (const line of LOGO) console.log(chalk.magenta(line));
      console.log(chalk.bold(`piggyback ${this.role}  v${VERSION}`));
      for (const [k, v] of Object.entries(this.info)) {
        if (v != null) console.log(`  ${k.padEnd(16)} ${v}`);
      }
    }
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  setInfo(partial) {
    Object.assign(this.info, partial);
    this._scheduleRender();
  }

  setStatus(status) {
    this.status = status;
    if (!this.tty) console.log(`[status] ${status}`);
    this._scheduleRender();
  }

  event(text, kind = "info") {
    const entry = { ts: nowHHMMSS(), text, kind };
    this.events.unshift(entry);
    if (this.events.length > this.maxEvents) this.events.length = this.maxEvents;
    if (!this.tty) console.log(`${entry.ts}  ${this._kindGlyph(kind, true)}  ${text}`);
    this._scheduleRender();
  }

  incr(metric, by = 1) {
    this.metrics[metric] = (this.metrics[metric] || 0) + by;
  }

  set(metric, value) {
    this.metrics[metric] = value;
  }

  _kindGlyph(kind, plain = false) {
    if (plain) {
      return ({ open: "+", close: "-", error: "!", info: ">" })[kind] || ">";
    }
    switch (kind) {
      case "open": return chalk.green("+");
      case "close": return chalk.gray("-");
      case "error": return chalk.red("!");
      default: return chalk.cyan(">");
    }
  }

  _scheduleRender() {
    if (!this.tty || this._renderScheduled) return;
    this._renderScheduled = true;
    setImmediate(() => {
      this._renderScheduled = false;
      this._render();
    });
  }

  _render() {
    const out = [];
    const push = (s = "") => out.push(s);

    out.push("\x1b[H\x1b[2J"); // home + clear

    for (const line of LOGO) push("  " + chalk.magenta(line));
    push();
    push(
      `  ${chalk.bold("piggyback")} ${chalk.cyan(this.role)}` +
      `   ${chalk.gray("v" + VERSION)}` +
      chalk.gray("                              (Ctrl+C to quit)")
    );
    push();

    const statusColor =
      this.status === "online" ? chalk.green :
      this.status === "starting" ? chalk.yellow :
      chalk.red;
    const uptime = fmtDuration(Date.now() - this.startedAt);

    const labelW = 18;
    const row = (k, v) => `  ${chalk.dim(k.padEnd(labelW))}${v}`;

    push(row("Status", `${statusColor(this.status)} ${chalk.gray("(uptime " + uptime + ")")}`));
    for (const [k, v] of Object.entries(this.info)) {
      if (v != null) push(row(k, String(v)));
    }
    push();

    push(
      `  ${chalk.dim("Connections".padEnd(labelW))}` +
      `${chalk.dim("total")} ${String(this.metrics.totalConns).padEnd(8)}` +
      `${chalk.dim("active")} ${String(this.metrics.activeConns).padEnd(8)}` +
      `${chalk.dim("in")} ${fmtBytes(this.metrics.bytesIn).padEnd(11)}` +
      `${chalk.dim("out")} ${fmtBytes(this.metrics.bytesOut)}`
    );
    push();

    push(chalk.dim("  Recent events"));
    push(chalk.dim("  " + "─".repeat(64)));
    if (this.events.length === 0) {
      push(chalk.dim("  (none yet — waiting for traffic)"));
    } else {
      for (const e of this.events) {
        push(`  ${chalk.gray(e.ts)}  ${this._kindGlyph(e.kind)}  ${e.text}`);
      }
    }

    process.stdout.write(out.join("\n") + "\n");
  }
}

module.exports = { Dashboard, fmtBytes };
