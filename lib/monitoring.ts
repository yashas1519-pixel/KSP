/**
 * Monitoring module — automated alert triggers for health events.
 */

import { BMICategory } from "@/constants/bmi";
import { createAlert } from "@/services/notifications";
import { getStaffByPrison } from "@/services/user";
import { getLatestHealthLog } from "@/services/health";

/**
 * Called after every weight check-in. If BMI is OBESE_1 or OBESE_2,
 * creates a critical BMI alert for the staff member.
 */
export async function checkBMIAlerts(
  uid: string,
  bmiCategory: BMICategory
): Promise<void> {
  if (bmiCategory === BMICategory.OBESE_1 || bmiCategory === BMICategory.OBESE_2) {
    await createAlert(
      uid,
      "bmi_critical",
      "Your BMI has reached a concerning level. Please consult a doctor.",
      "ನಿಮ್ಮ BMI ಅಪಾಯಕಾರಿ ಮಟ್ಟ ತಲುಪಿದೆ. ದಯವಿಟ್ಟು ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ."
    );
  }
}

/**
 * Scans all staff in a prison. If a staff member's last health log
 * is older than 30 days (or they have none), creates a check-in overdue alert.
 * Returns the number of alerts created.
 */
export async function checkCheckInAlerts(prisonId: string): Promise<number> {
  const staff = await getStaffByPrison(prisonId, 200);
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  let alertsCreated = 0;

  for (const s of staff) {
    const log = await getLatestHealthLog(s.uid);
    let isOverdue = false;

    if (!log) {
      isOverdue = true;
    } else {
      const logDate =
        typeof log.timestamp === "object" && "seconds" in (log.timestamp as object)
          ? new Date(((log.timestamp as unknown as { seconds: number }).seconds) * 1000)
          : new Date(log.timestamp);
      if (logDate < thirtyDaysAgo) {
        isOverdue = true;
      }
    }

    if (isOverdue) {
      await createAlert(
        s.uid,
        "no_checkin_30d",
        "You have not logged your weight in 30 days.",
        "ನೀವು 30 ದಿನಗಳಿಂದ ತೂಕ ದಾಖಲಿಸಿಲ್ಲ."
      );
      alertsCreated++;
    }
  }

  return alertsCreated;
}

/**
 * Called when a Prison Head or Super Admin approves a plan.
 * Sends a notification to the staff member.
 */
export async function checkPlanApprovedAlert(
  uid: string,
  planType: "diet" | "exercise"
): Promise<void> {
  const typeLabel = planType === "diet" ? "diet" : "exercise";
  const typeLabelKn = planType === "diet" ? "ಆಹಾರ" : "ವ್ಯಾಯಾಮ";

  await createAlert(
    uid,
    "plan_approved",
    `Your ${typeLabel} plan has been approved.`,
    `ನಿಮ್ಮ ${typeLabelKn} ಯೋಜನೆ ಅನುಮೋದಿಸಲಾಗಿದೆ.`
  );
}
