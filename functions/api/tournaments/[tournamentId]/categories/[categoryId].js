import { handleTournament } from "../../../utils/tournaments/service.js";
export const onRequest = context => handleTournament(context,"category");
