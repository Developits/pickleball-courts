/**
 * Queue management and priority calculation utilities
 */

export function calculatePriorityScore(queueItem, currentTime) {
  const { total_matches_today, joined_at, game_preference } = queueItem;
  
  // Base score from games played (fewer games = higher priority)
  let score = 100 * (10 - (total_matches_today || 0));
  
  // Wait time bonus (2 points per minute)
  const joinedAt = new Date(joined_at);
  const now = currentTime || new Date();
  const waitMinutes = Math.max(0, (now - joinedAt) / (1000 * 60));
  score += 2 * waitMinutes;
  
  // Game preference bonus (50 points if not 'any')
  if (game_preference && game_preference !== 'any') {
    score += 50;
  }
  
  // Late arrival bonus (1000 points if after 20:30 and played less than 2 matches)
  const settings = queueItem.settings || {};
  const lateArrivalTime = settings.late_arrival_time || '20:30';
  const lateThreshold = parseInt(settings.late_arrival_priority_threshold || '2');
  
  const [hours, minutes] = lateArrivalTime.split(':').map(Number);
  const lateTime = new Date(now);
  lateTime.setHours(hours, minutes, 0, 0);
  
  if (now >= lateTime && (total_matches_today || 0) < lateThreshold) {
    score += 1000;
  }
  
  return Math.round(score);
}

export function isInSitOutPeriod(user, currentTime) {
  if (!user.sit_out_until) return false;
  
  const sitOutUntil = new Date(user.sit_out_until);
  const now = currentTime || new Date();
  
  return now < sitOutUntil;
}

export function getSitOutEndTime(matchesToSit, currentTime) {
  // Each "sit out" lasts approximately 1 match duration (estimated 30 minutes)
  // In a real system, this would be calculated based on actual match endings
  const now = currentTime || new Date();
  const sitOutEnd = new Date(now);
  sitOutEnd.setMinutes(sitOutEnd.getMinutes() + 30 * matchesToSit);
  return sitOutEnd.toISOString();
}

export function calculateCourtAllocation(waitingWomen, settings) {
  const defaultMens = parseInt(settings.default_mens_double_courts || '2');
  const defaultMixed = parseInt(settings.default_mixed_double_courts || '1');
  
  let mensCourts = defaultMens;
  let mixedCourts = defaultMixed;
  
  // If 4+ women waiting, allocate more mixed doubles courts
  if (waitingWomen >= 4) {
    mensCourts = 1;
    mixedCourts = 2;
  }
  
  // If enough women for women's doubles, replace one mixed court
  // For this, we'd need more data, but this is a placeholder
  let womensCourts = 0;
  
  return { mensCourts, mixedCourts, womensCourts };
}
