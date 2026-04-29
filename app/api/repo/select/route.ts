import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

export async function POST() {
  if (process.platform !== "darwin") {
    return NextResponse.json(
      {
        error: "Native folder selection is currently implemented for macOS only.",
      },
      { status: 400 },
    );
  }

  try {
    const { stdout } = await execFileAsync("osascript", [
      "-e",
      'POSIX path of (choose folder with prompt "Choose a repository for cocanvas")',
    ]);

    return NextResponse.json({
      repoPath: stdout.trim().replace(/\/$/, ""),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Folder selection was cancelled.";

    if (message.includes("User cancelled") || message.includes("(-128)")) {
      return NextResponse.json({
        cancelled: true,
      });
    }

    return NextResponse.json(
      {
        error: message,
      },
      { status: 400 },
    );
  }
}
