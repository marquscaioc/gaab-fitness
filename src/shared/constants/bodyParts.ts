export const BODY_PARTS = [
  'back', 'cardio', 'chest', 'lower arms', 'lower legs',
  'neck', 'shoulders', 'upper arms', 'upper legs', 'waist',
] as const;

export type BodyPart = (typeof BODY_PARTS)[number];
