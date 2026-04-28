import { buildAuthHeaders, getApiBaseUrl } from '@/services/api';

type ActivityReason = 'launch' | 'background' | 'logout';

let hasLaunchActivityRecorded = false;
let hasExitActivityRecorded = false;
let hasEligibleScreenOpened = false;
let launchActivityInFlight: Promise<boolean> | null = null;
let exitActivityInFlight: Promise<boolean> | null = null;

async function postUserActivity(token: string, reason: ActivityReason) {
  try {
    const resp = await fetch(`${getApiBaseUrl()}/auth/activity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(token),
      },
      body: JSON.stringify({ reason }),
    });
    return resp.ok;
  } catch (error) {
    console.error('[Activity] report failed:', error);
    return false;
  }
}

export function resetRuntimeActivityTracking() {
  hasLaunchActivityRecorded = false;
  hasExitActivityRecorded = false;
  hasEligibleScreenOpened = false;
  launchActivityInFlight = null;
  exitActivityInFlight = null;
}

export async function reportLaunchActivityIfNeeded(token: string | null) {
  if (!token) {
    return false;
  }

  hasEligibleScreenOpened = true;
  if (hasLaunchActivityRecorded) {
    return false;
  }
  if (launchActivityInFlight) {
    return await launchActivityInFlight;
  }

  launchActivityInFlight = (async () => {
    const ok = await postUserActivity(token, 'launch');
    if (ok) {
      hasLaunchActivityRecorded = true;
    }
    return ok;
  })();

  try {
    return await launchActivityInFlight;
  } finally {
    launchActivityInFlight = null;
  }
}

export async function reportExitActivityIfNeeded(token: string | null, reason: ActivityReason = 'background') {
  if (!token || !hasEligibleScreenOpened || hasExitActivityRecorded) {
    return false;
  }
  if (exitActivityInFlight) {
    return await exitActivityInFlight;
  }

  exitActivityInFlight = (async () => {
    const ok = await postUserActivity(token, reason);
    if (ok) {
      hasExitActivityRecorded = true;
    }
    return ok;
  })();

  try {
    return await exitActivityInFlight;
  } finally {
    exitActivityInFlight = null;
  }
}

export async function reportLogoutActivityIfNeeded(token: string | null) {
  return await reportExitActivityIfNeeded(token, 'logout');
}
