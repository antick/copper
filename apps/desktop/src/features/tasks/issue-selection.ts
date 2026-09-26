export interface IssueSelectionState {
  ids: string[];
  focusedId: string | null;
  anchorId: string | null;
}

export type IssueSelectionAction =
  | { type: "focus"; id: string }
  | { type: "toggle"; id: string }
  | { type: "range"; id: string; order: string[] }
  | { type: "context"; id: string }
  | { type: "clear" };

export const emptyIssueSelection: IssueSelectionState = {
  ids: [],
  focusedId: null,
  anchorId: null,
};

export function issueSelectionReducer(
  state: IssueSelectionState,
  action: IssueSelectionAction,
): IssueSelectionState {
  switch (action.type) {
    case "focus":
      return { ...state, focusedId: action.id };
    case "toggle": {
      const selected = state.ids.includes(action.id);
      return {
        ids: selected
          ? state.ids.filter((id) => id !== action.id)
          : [...state.ids, action.id],
        focusedId: action.id,
        anchorId: action.id,
      };
    }
    case "range": {
      const anchor = state.anchorId ?? state.focusedId ?? action.id;
      const from = action.order.indexOf(anchor);
      const to = action.order.indexOf(action.id);
      if (from < 0 || to < 0) {
        return { ids: [action.id], focusedId: action.id, anchorId: action.id };
      }
      const [start, end] = from < to ? [from, to] : [to, from];
      return {
        ids: action.order.slice(start, end + 1),
        focusedId: action.id,
        anchorId: anchor,
      };
    }
    case "context":
      return state.ids.includes(action.id)
        ? { ...state, focusedId: action.id }
        : { ids: [action.id], focusedId: action.id, anchorId: action.id };
    case "clear":
      return { ...emptyIssueSelection, focusedId: state.focusedId };
    default:
      return state;
  }
}
