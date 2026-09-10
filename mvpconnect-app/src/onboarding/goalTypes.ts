export type ArtistGoal =
  | 'BOOK_SHOWS'
  | 'FIND_PROMOTERS'
  | 'FIND_COLLABORATORS'
  | 'START_OR_JOIN_BAND';

export type VenueGoal =
  | 'FIND_ARTISTS'
  | 'FIND_PROMOTERS'
  | 'FILL_OPEN_DATES';

export type PromoterGoal =
  | 'FIND_ARTISTS'
  | 'FIND_VENUES'
  | 'BUILD_MY_ROSTER'
  | 'BOOK_MY_ARTISTS';

export interface ArtistGoalsStepRequest {
  connectionGoals: ArtistGoal[];
}

export interface VenueGoalsStepRequest {
  connectionGoals: VenueGoal[];
}

export interface PromoterGoalsStepRequest {
  connectionGoals: PromoterGoal[];
}

export type GoalCode = ArtistGoal | VenueGoal | PromoterGoal;
export type GoalsStepRequest =
  | ArtistGoalsStepRequest
  | VenueGoalsStepRequest
  | PromoterGoalsStepRequest;
