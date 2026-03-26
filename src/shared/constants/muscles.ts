export const MUSCLES = [
  'abs', 'abductors', 'adductors', 'biceps', 'brachialis',
  'calves', 'cardiovascular system', 'core', 'deltoids',
  'forearms', 'glutes', 'hamstrings', 'hip flexors',
  'infraspinatus', 'lats', 'latissimus dorsi', 'levator scapulae',
  'lower back', 'obliques', 'pectorals', 'quads', 'quadriceps',
  'rear deltoids', 'rhomboids', 'rotator cuff', 'serratus anterior',
  'shoulders', 'soleus', 'sternocleidomastoid', 'subscapularis',
  'supraspinatus', 'teres major', 'teres minor', 'traps',
  'trapezius', 'triceps', 'upper back', 'wrist extensors',
  'wrist flexors',
] as const;

export type Muscle = (typeof MUSCLES)[number];

export const PRIMARY_MUSCLES = [
  'abs', 'biceps', 'calves', 'chest', 'deltoids', 'forearms',
  'glutes', 'hamstrings', 'lats', 'obliques', 'pectorals',
  'quads', 'shoulders', 'traps', 'triceps',
] as const;
