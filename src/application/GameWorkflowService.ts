import { Effect, Context, Layer, Option } from "effect";
import { GameState, DiceHold, DiceRoll, ScoreCategory } from "../domain/types";
import { initGame, rollDice, selectCategory, surrenderGame, offerSurrender as domainOfferSurrender, acceptSurrender as domainAcceptSurrender, declineSurrender as domainDeclineSurrender } from "../domain/game";
import { calculateEloChange } from "../domain/elo";
import { calculateScore } from "../domain/score";
import { PlayerRepository, MatchRepository, GameRepository, InvitationRepository, MatchQueueRepository, ColosseumRepository, ColosseumMatchRecord, ColosseumBetRecord } from "../persistence/repository";
import { Invitation, isInvitationExpired } from "../domain/invitation";
import { MatchQueue, isMatchQueueExpired } from "../domain/matchQueue";
import { selectRandomGladiators, calculateOdds, validateBet, calculatePayout, GLADIATOR_PERSONAS, PersonaId, BetValidationError } from "../domain/colosseum";
import { DiscordApiService, FlyBrainUrl } from "../presentation/discord/adapter/api";
import { DiscordResponseSerializer } from "../presentation/discord/adapter/serializer";
import { 
  KoreanMessages, 
  determineTeasingNotification, 
  getMultiSurrenderMessage, 
  getMultiFinishedMessage, 
  getMultiDrawMessage 
} from "../presentation/messages/ko";
import { 
  GameAlreadyOverError, 
  RollLimitExceededError, 
  CategoryAlreadyFilledError, 
  InvalidStateActionError, 
  NotYourTurnError, 
  AllDiceHeldError,
  ActiveInvitationExistsError,
  InvitationNotFoundError,
  InvitationExpiredError,
  UnauthorizedInvitationError,
  ActiveMatchQueueExistsError,
  MatchQueueNotFoundError,
  MatchQueueExpiredError,
  SelfJoinQueueError,
  UnauthorizedCancelQueueError,
  UnauthorizedPlayAiError,
  ColosseumMatchNotFoundError,
  ColosseumBetClosedError,
  ColosseumAlreadyBetError
} from "../domain/errors";

export const FLY_AI_PLAYER_ID = "AI_FLY_BRAIN";
export const FLY_AI_PLAYER_NAME = "🪰 초파리 AI (FlyWire SNN)";


export class GameNotFoundError extends Error {
  readonly _tag = "GameNotFoundError";
  constructor(readonly gameId: string) {
    super(KoreanMessages.errors.gameNotFound(gameId));
    this.name = "GameNotFoundError";
  }
}

export class ActiveGameExistsError extends Error {
  readonly _tag = "ActiveGameExistsError";
  constructor(readonly messageId: string | undefined, readonly guildId: string, readonly channelId: string) {
    let url: string | undefined;
    if (messageId && channelId) {
      url = `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
    }
    super(KoreanMessages.errors.duplicateChallenge(url));
    this.name = "ActiveGameExistsError";
  }
}

export class NotInGameError extends Error {
  readonly _tag = "NotInGameError";
  constructor() {
    super(KoreanMessages.errors.notPlayerInGame);
    this.name = "NotInGameError";
  }
}

export interface ExecutionContext {
  readonly waitUntil: (promise: Promise<any>) => void;
}

export interface GameWorkflowService {
  readonly challenge: (
    p1Id: string,
    p1Name: string,
    p2Id: string | undefined,
    p2Name: string | undefined,
    guildId: string,
    channelId: string,
    applicationId: string,
    token: string,
    ctx: ExecutionContext
  ) => Effect.Effect<
    GameState, 
    any, 
    PlayerRepository | GameRepository | DiscordResponseSerializer
  >;

  readonly roll: (
    gameId: string,
    playerId: string,
    holds: DiceHold,
    applicationId: string,
    token: string,
    ctx: ExecutionContext
  ) => Effect.Effect<
    GameState, 
    any, 
    GameRepository | DiscordResponseSerializer | DiscordApiService
  >;

  readonly selectCategory: (
    gameId: string,
    playerId: string,
    category: ScoreCategory,
    guildId: string,
    channelId: string,
    messageId: string | undefined,
    ctx: ExecutionContext
  ) => Effect.Effect<
    GameState, 
    any, 
    GameRepository | MatchRepository | PlayerRepository | DiscordApiService | DiscordResponseSerializer
  >;

  readonly surrender: (
    gameId: string,
    playerId: string,
    guildId: string,
    channelId: string,
    messageId: string | undefined,
    ctx: ExecutionContext
  ) => Effect.Effect<
    GameState, 
    any, 
    GameRepository | MatchRepository | PlayerRepository | DiscordApiService | DiscordResponseSerializer
  >;

  readonly offerSurrender: (
    gameId: string,
    playerId: string
  ) => Effect.Effect<GameState, any, GameRepository>;

  readonly acceptSurrender: (
    gameId: string,
    playerId: string,
    guildId: string,
    channelId: string,
    messageId: string | undefined,
    ctx: ExecutionContext
  ) => Effect.Effect<
    GameState, 
    any, 
    GameRepository | MatchRepository | PlayerRepository | DiscordApiService | DiscordResponseSerializer
  >;

  readonly declineSurrender: (
    gameId: string,
    playerId: string
  ) => Effect.Effect<GameState, any, GameRepository>;

  readonly createInvitation: (
    challengerId: string,
    challengerName: string,
    opponentId: string,
    opponentName: string,
    guildId: string,
    channelId: string
  ) => Effect.Effect<Invitation, any, InvitationRepository | GameRepository | PlayerRepository>;

  readonly acceptInvitation: (
    invitationId: string,
    userId: string,
    userName: string,
    guildId: string,
    channelId: string
  ) => Effect.Effect<GameState, any, InvitationRepository | GameRepository | PlayerRepository>;

  readonly declineInvitation: (
    invitationId: string,
    userId: string
  ) => Effect.Effect<Invitation, any, InvitationRepository>;

  readonly createMatchQueue: (
    hostId: string,
    hostName: string,
    guildId: string,
    channelId: string
  ) => Effect.Effect<MatchQueue, any, MatchQueueRepository | PlayerRepository>;

  readonly joinMatchQueue: (
    queueId: string,
    guestId: string,
    guestName: string,
    guildId: string,
    channelId: string
  ) => Effect.Effect<GameState, any, MatchQueueRepository | GameRepository | PlayerRepository>;

  readonly cancelMatchQueue: (
    queueId: string,
    userId: string
  ) => Effect.Effect<MatchQueue, any, MatchQueueRepository>;

  readonly playWithFlyAiFromQueue: (
    queueId: string,
    userId: string,
    guildId: string,
    channelId: string,
    messageId?: string
  ) => Effect.Effect<GameState, any, MatchQueueRepository | GameRepository | PlayerRepository>;

  readonly playWithFlyAiFromInvitation: (
    invitationId: string,
    userId: string,
    guildId: string,
    channelId: string,
    messageId?: string
  ) => Effect.Effect<GameState, any, InvitationRepository | GameRepository | PlayerRepository>;

  readonly executeAiTurn: (
    gameId: string,
    guildId: string,
    channelId: string,
    messageId: string
  ) => Effect.Effect<GameState | void, any, GameRepository | MatchRepository | PlayerRepository | DiscordApiService | DiscordResponseSerializer>;

  readonly createColosseumMatch: (
    guildId: string,
    channelId: string
  ) => Effect.Effect<ColosseumMatchRecord, any, ColosseumRepository>;

  readonly placeColosseumBet: (
    matchId: string,
    userId: string,
    userName: string,
    guildId: string,
    chosenPersona: "A" | "B",
    amount: number
  ) => Effect.Effect<
    { readonly match: ColosseumMatchRecord; readonly bet: ColosseumBetRecord; readonly allBets: readonly ColosseumBetRecord[] },
    any,
    ColosseumRepository | PlayerRepository
  >;

  readonly startColosseumDuel: (
    matchId: string,
    channelId: string,
    messageId: string,
    ctx: ExecutionContext
  ) => Effect.Effect<
    ColosseumMatchRecord,
    any,
    ColosseumRepository | PlayerRepository | DiscordApiService | DiscordResponseSerializer
  >;

  readonly executeColosseumMatch: (
    matchId: string,
    channelId: string,
    messageId: string
  ) => Effect.Effect<
    void,
    any,
    ColosseumRepository | PlayerRepository | DiscordApiService | DiscordResponseSerializer
  >;
}

export const GameWorkflowService = Context.GenericTag<GameWorkflowService>("@services/GameWorkflowService");

const randomDice = (): 1 | 2 | 3 | 4 | 5 | 6 =>
  (Math.floor(Math.random() * 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6;

const rollProvider: Effect.Effect<DiceRoll, never> = Effect.sync(() => [
  randomDice(),
  randomDice(),
  randomDice(),
  randomDice(),
  randomDice()
]);

const processSurrender = (
  gameId: string,
  playerId: string,
  guildId: string,
  channelId: string,
  messageId: string | undefined,
  ctx: any,
  expectedPendingProposerId?: string
) =>
  Effect.gen(function* () {
    const gameRepo = yield* GameRepository;
    const playerRepo = yield* PlayerRepository;
    const matchRepo = yield* MatchRepository;
    const apiService = yield* DiscordApiService;
    const serializer = yield* DiscordResponseSerializer;

    const gameStateOption = yield* gameRepo.findById(gameId);
    if (Option.isNone(gameStateOption)) {
      return yield* Effect.fail(new GameNotFoundError(gameId));
    }
    const gameState = gameStateOption.value;

    if (gameState.status === "Finished") {
      return yield* Effect.fail(new GameAlreadyOverError(gameId));
    }

    if (
      expectedPendingProposerId !== undefined &&
      gameState.pendingSurrenderOfferByPlayerId !== expectedPendingProposerId
    ) {
      return yield* Effect.fail(
        new InvalidStateActionError("The surrender proposal is no longer active.")
      );
    }

    const isPlayerInGame = gameState.players.some((p) => p.playerId === playerId);
    if (!isPlayerInGame) {
      return yield* Effect.fail(new NotInGameError());
    }

    const nextState = yield* surrenderGame(gameState, playerId);
    yield* gameRepo.delete(gameState.gameId);
    yield* Effect.logInfo(`Player ${playerId} surrendered game ${gameId}. Active game deleted.`);

    // Delete mention on action
    if (gameState.lastMentionMessageId && gameState.lastMentionChannelId) {
      const deleteMentionTask = apiService.deleteMessage(gameState.lastMentionChannelId, gameState.lastMentionMessageId).pipe(
        Effect.catchAll(() => Effect.void)
      );
      ctx.waitUntil(Effect.runPromise(deleteMentionTask));
    }

    // Handle Game End stats, ELO, saving Match
    const handleGameEnd = (endedState: GameState) =>
      Effect.gen(function* () {
        const matchId = endedState.gameId;
        const mode = endedState.mode;
        const p1 = endedState.players[0];
        const p2 = endedState.mode === "multi" ? endedState.players[1] : null;

        let winnerId: string | null = null;
        if (mode === "multi" && p2) {
          winnerId = endedState.surrenderedPlayerId === p1.playerId ? p2.playerId : p1.playerId;
        }

        let player1EloAfter: number | null = null;
        let player2EloAfter: number | null = null;
        let eloResult: { newRatingA: number; newRatingB: number; deltaA: number; deltaB: number } | null = null;

        if (mode === "multi" && p2) {
          const p1StatsOption = yield* playerRepo.getPlayer(p1.playerId, guildId);
          const p2StatsOption = yield* playerRepo.getPlayer(p2.playerId, guildId);
          const p1Elo = Option.isSome(p1StatsOption) ? p1StatsOption.value.elo : 1000;
          const p2Elo = Option.isSome(p2StatsOption) ? p2StatsOption.value.elo : 1000;

          const outcome = endedState.surrenderedPlayerId === p1.playerId ? 0 : 1;
          eloResult = calculateEloChange(p1Elo, p2Elo, outcome);
          player1EloAfter = eloResult.newRatingA;
          player2EloAfter = eloResult.newRatingB;
        }

        const matchRecord = {
          id: matchId,
          mode,
          guildId: guildId,
          player1Id: p1.playerId,
          player2Id: p2 ? p2.playerId : null,
          player1Score: p1.totalScore,
          player2Score: p2 ? p2.totalScore : null,
          winnerId,
          surrenderedId: endedState.surrenderedPlayerId || null,
          playedAt: new Date(),
          historyJson: JSON.stringify(endedState.turnHistory),
          player1EloAfter,
          player2EloAfter
        };

        yield* matchRepo.saveMatch(matchRecord);
        yield* Effect.logInfo(`Game surrendered. Match record saved to D1.`);

        let endMsgContent = "";

        if (mode === "single") {
          yield* playerRepo.updateStats(p1.playerId, guildId, "single", "win", p1.totalScore);
          endMsgContent = KoreanMessages.gameEnd.singleSurrendered(p1.playerId, p1.totalScore);
        } else if (p2 && eloResult) {
          yield* playerRepo.updateElo(p1.playerId, guildId, eloResult.newRatingA);
          yield* playerRepo.updateElo(p2.playerId, guildId, eloResult.newRatingB);

          if (endedState.surrenderedPlayerId === p1.playerId) {
            yield* playerRepo.updateStats(p1.playerId, guildId, "multi", "loss", p1.totalScore);
            yield* playerRepo.updateStats(p2.playerId, guildId, "multi", "win", p1.totalScore);
          } else {
            yield* playerRepo.updateStats(p1.playerId, guildId, "multi", "win", p1.totalScore);
            yield* playerRepo.updateStats(p2.playerId, guildId, "multi", "loss", p2.totalScore);
          }

          const formatDelta = (d: number) => d >= 0 ? `▲+${d}` : `▼${d}`;
          const deltaA = formatDelta(eloResult.deltaA);
          const deltaB = formatDelta(eloResult.deltaB);

          endMsgContent = getMultiSurrenderMessage(p1.playerId, p2.playerId, endedState.surrenderedPlayerId!, eloResult.newRatingA, eloResult.newRatingB, deltaA, deltaB);
        }

        if (channelId && endMsgContent) {
          const endMessageTask = apiService.sendGameEndMessage(channelId, endMsgContent, messageId).pipe(
            Effect.catchAll((err) => Effect.logError(`Error sending game end message: ${err}`))
          );
          ctx.waitUntil(Effect.runPromise(endMessageTask));
        }
      });

    yield* handleGameEnd(nextState);

    // Edit main board message to finished state
    if (channelId && messageId) {
      const finishedPayload = serializer.serializeGame(nextState);
      const editMainBoardTask = apiService.editMessage(channelId, messageId, finishedPayload.data).pipe(
        Effect.catchAll((err) => Effect.logError(`Failed to update main game board on surrender: ${err}`))
      );
      ctx.waitUntil(Effect.runPromise(editMainBoardTask));
    }

    return nextState;
  });

const executeAiTurnLogic = (
  gameId: string,
  guildId: string,
  channelId: string,
  messageId: string
) =>
  Effect.gen(function* () {
    const gameRepo = yield* GameRepository;
    const playerRepo = yield* PlayerRepository;
    const matchRepo = yield* MatchRepository;
    const apiService = yield* DiscordApiService;
    const serializer = yield* DiscordResponseSerializer;
    const flyUrlOpt = yield* Effect.serviceOption(FlyBrainUrl);
    const flyUrl = Option.isSome(flyUrlOpt) ? flyUrlOpt.value : "";

    yield* Effect.sleep("1 second");

    const gameStateOpt = yield* gameRepo.findById(gameId);
    if (Option.isNone(gameStateOpt)) return;
    let state = gameStateOpt.value;
    if (state.status === "Finished") return;

    const currentP = state.players[state.currentPlayerIndex];
    if (currentP.playerId !== FLY_AI_PLAYER_ID) return;

    const allCategories: ScoreCategory[] = [
      "Aces", "Deuces", "Treys", "Fours", "Fives", "Sixes",
      "Choice", "FourOfAKind", "FullHouse", "SmallStraight", "LargeStraight", "Yacht"
    ];
    const availableCategories = allCategories.filter((c) => currentP.scoreBoard[c] === undefined);
    if (availableCategories.length === 0) return;

    // Helper to update Discord message during turn
    const renderBoard = (s: GameState, h: string) => {
      if (!channelId || !messageId) return Effect.void;
      const payload = serializer.serializeGame(s, h, flyUrl);
      return apiService.editMessage(channelId, messageId, payload.data).pipe(
        Effect.catchAll(() => Effect.void)
      );
    };

    // Roll 1 for AI
    state = yield* rollDice(state, [false, false, false, false, false], rollProvider);
    yield* gameRepo.save(state);
    yield* renderBoard(state, "00000");
    yield* Effect.sleep("1.2 seconds");

    const callFlyApi = (dice: readonly number[], rollCount: number) =>
      Effect.tryPromise({
        try: async () => {
          if (!flyUrl) throw new Error("FLY_BRAIN_URL is not configured");
          const res = await fetch(`${flyUrl}/api/fly/act`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dice: [...dice],
              roll_count: rollCount,
              available_categories: availableCategories
            })
          });
          if (!res.ok) throw new Error(`FlyBrain server status: ${res.status}`);
          return (await res.json()) as { action: "hold" | "score"; holds?: boolean[]; category?: ScoreCategory };
        },
        catch: (err) => err as Error
      });

    const pickBestCategory = (dice: DiceRoll, categories: ScoreCategory[]): ScoreCategory => {
      let best = categories[0];
      let maxScore = -1;
      for (const cat of categories) {
        const score = calculateScore(cat, dice);
        if (score > maxScore) {
          maxScore = score;
          best = cat;
        }
      }
      return best;
    };

    const fallbackCategory = pickBestCategory(state.currentDice, availableCategories);

    const d1 = yield* callFlyApi(state.currentDice, 1).pipe(
      Effect.catchAll(() => Effect.succeed({ action: "score" as const, category: fallbackCategory }))
    );

    let chosenCategory: ScoreCategory = fallbackCategory;

    if (d1.action === "hold" && d1.holds && d1.holds.length === 5 && !d1.holds.every(Boolean)) {
      const hold1 = d1.holds.map(Boolean) as [boolean, boolean, boolean, boolean, boolean];
      const hold1Str = hold1.map((h) => (h ? "1" : "0")).join("");

      // Show held dice locks before roll 2
      yield* renderBoard(state, hold1Str);
      yield* Effect.sleep("1 second");

      // Roll 2
      state = yield* rollDice(state, hold1, rollProvider).pipe(
        Effect.catchAll(() => Effect.succeed(state))
      );
      yield* gameRepo.save(state);
      yield* renderBoard(state, hold1Str);
      yield* Effect.sleep("1.2 seconds");

      const d2 = yield* callFlyApi(state.currentDice, 2).pipe(
        Effect.catchAll(() => Effect.succeed({ action: "score" as const, category: pickBestCategory(state.currentDice, availableCategories) }))
      );

      if (d2.action === "hold" && d2.holds && d2.holds.length === 5 && !d2.holds.every(Boolean)) {
        const hold2 = d2.holds.map(Boolean) as [boolean, boolean, boolean, boolean, boolean];
        const hold2Str = hold2.map((h) => (h ? "1" : "0")).join("");

        // Show held dice locks before roll 3
        yield* renderBoard(state, hold2Str);
        yield* Effect.sleep("1 second");

        // Roll 3
        state = yield* rollDice(state, hold2, rollProvider).pipe(
          Effect.catchAll(() => Effect.succeed(state))
        );
        yield* gameRepo.save(state);
        yield* renderBoard(state, hold2Str);
        yield* Effect.sleep("1.2 seconds");

        const d3 = yield* callFlyApi(state.currentDice, 3).pipe(
          Effect.catchAll(() => Effect.succeed({ action: "score" as const, category: pickBestCategory(state.currentDice, availableCategories) }))
        );
        chosenCategory = d3.category && availableCategories.includes(d3.category) ? d3.category : pickBestCategory(state.currentDice, availableCategories);
      } else {
        chosenCategory = d2.category && availableCategories.includes(d2.category) ? d2.category : pickBestCategory(state.currentDice, availableCategories);
      }
    } else {
      chosenCategory = d1.category && availableCategories.includes(d1.category) ? d1.category : pickBestCategory(state.currentDice, availableCategories);
    }

    yield* Effect.sleep("800 millis");

    const nextState = yield* selectCategory(state, chosenCategory);

    if (nextState.status === "Finished") {
      yield* gameRepo.delete(nextState.gameId);

      const p1 = nextState.players[0];
      const p2 = nextState.players[1];
      const p1StatsOpt = yield* playerRepo.getPlayer(p1.playerId, guildId);
      const p2StatsOpt = yield* playerRepo.getPlayer(p2.playerId, guildId);
      const p1Elo = Option.isSome(p1StatsOpt) ? p1StatsOpt.value.elo : 1000;
      const p2Elo = Option.isSome(p2StatsOpt) ? p2StatsOpt.value.elo : 1000;
      const outcome = p1.totalScore > p2.totalScore ? 1 : (p2.totalScore > p1.totalScore ? 0 : 0.5);
      const eloResult = calculateEloChange(p1Elo, p2Elo, outcome);

      const matchRecord = {
        id: nextState.gameId,
        mode: "multi" as const,
        guildId,
        player1Id: p1.playerId,
        player2Id: p2.playerId,
        player1Score: p1.totalScore,
        player2Score: p2.totalScore,
        winnerId: p1.totalScore > p2.totalScore ? p1.playerId : (p2.totalScore > p1.totalScore ? p2.playerId : null),
        surrenderedId: null,
        playedAt: new Date(),
        historyJson: JSON.stringify(nextState.turnHistory),
        player1EloAfter: eloResult.newRatingA,
        player2EloAfter: eloResult.newRatingB
      };

      yield* matchRepo.saveMatch(matchRecord);
      yield* playerRepo.updateElo(p1.playerId, guildId, eloResult.newRatingA);
      yield* playerRepo.updateElo(p2.playerId, guildId, eloResult.newRatingB);
      if (p1.totalScore > p2.totalScore) {
        yield* playerRepo.updateStats(p1.playerId, guildId, "multi", "win", p1.totalScore);
        yield* playerRepo.updateStats(p2.playerId, guildId, "multi", "loss", p2.totalScore);
      } else if (p2.totalScore > p1.totalScore) {
        yield* playerRepo.updateStats(p1.playerId, guildId, "multi", "loss", p1.totalScore);
        yield* playerRepo.updateStats(p2.playerId, guildId, "multi", "win", p2.totalScore);
      } else {
        yield* playerRepo.updateStats(p1.playerId, guildId, "multi", "draw", p1.totalScore);
        yield* playerRepo.updateStats(p2.playerId, guildId, "multi", "draw", p2.totalScore);
      }

      const formatDelta = (d: number) => d >= 0 ? `▲+${d}` : `▼${d}`;
      const deltaA = formatDelta(eloResult.deltaA);
      const deltaB = formatDelta(eloResult.deltaB);

      const endMsg = p1.totalScore > p2.totalScore
        ? getMultiFinishedMessage(p1.playerId, p2.playerId, p1.totalScore, p2.totalScore, eloResult.newRatingA, eloResult.newRatingB, deltaA, deltaB)
        : (p2.totalScore > p1.totalScore
          ? getMultiFinishedMessage(p2.playerId, p1.playerId, p2.totalScore, p1.totalScore, eloResult.newRatingB, eloResult.newRatingA, deltaB, deltaA)
          : getMultiDrawMessage(p1.playerId, p2.playerId, p1.totalScore, eloResult.newRatingA, eloResult.newRatingB, deltaA, deltaB));

      if (channelId && messageId) {
        yield* apiService.sendGameEndMessage(channelId, endMsg, messageId).pipe(Effect.catchAll(() => Effect.void));
        const finalSerialized = serializer.serializeGame(nextState, "00000", flyUrl);
        yield* apiService.editMessage(channelId, messageId, finalSerialized.data).pipe(Effect.catchAll(() => Effect.void));
      }
    } else {
      yield* gameRepo.save(nextState);
      const humanPlayer = nextState.players[nextState.currentPlayerIndex];
      if (channelId && messageId) {
        const boardSerialized = serializer.serializeGame(nextState, "00000", flyUrl);
        yield* apiService.editMessage(channelId, messageId, boardSerialized.data).pipe(Effect.catchAll(() => Effect.void));
        const newMentionId = yield* apiService.sendMention(channelId, humanPlayer.playerId, messageId).pipe(
          Effect.catchAll(() => Effect.succeed(""))
        );
        if (newMentionId) {
          yield* gameRepo.save({
            ...nextState,
            lastMentionMessageId: newMentionId,
            lastMentionChannelId: channelId
          });
        }
      }
    }
    return nextState;
  });

export const GameWorkflowServiceLive = Layer.succeed(
  GameWorkflowService,
  {
    challenge: (p1Id, p1Name, p2Id, p2Name, guildId, channelId, applicationId, token, ctx) =>
      Effect.gen(function* () {
        const playerRepo = yield* PlayerRepository;
        const gameRepo = yield* GameRepository;
        const serializer = yield* DiscordResponseSerializer;

        const player1 = { playerId: p1Id, playerName: p1Name };
        const mode = p2Id ? "multi" : "single";

        if (mode === "multi" && p2Id) {
          const activeGameOpt = yield* gameRepo.findActiveGameByPlayers(p1Id, p2Id);
          if (Option.isSome(activeGameOpt)) {
            const activeGame = activeGameOpt.value;
            return yield* Effect.fail(
              new ActiveGameExistsError(activeGame.initialMessageId, guildId, channelId)
            );
          }
        }

        yield* playerRepo.upsertPlayer(p1Id, p1Name);
        if (p2Id && p2Name) {
          yield* playerRepo.upsertPlayer(p2Id, p2Name);
        }

        const players = p2Id && p2Name 
          ? [player1, { playerId: p2Id, playerName: p2Name }]
          : [player1];

        const gameState = yield* initGame(players, mode);
        yield* gameRepo.save(gameState);

        yield* Effect.logInfo(`Match initialized. Mode: ${mode}, Players: ${players.map(p => p.playerId).join(", ")}`);

        // Background task to patch initialMessageId
        const getOriginalMessageTask = Effect.gen(function* () {
          yield* Effect.sleep("1.5 seconds");
          const response = yield* Effect.tryPromise({
            try: () =>
              fetch(`https://discord.com/api/v10/webhooks/${applicationId}/${token}/messages/@original`, {
                method: "GET"
              }),
            catch: (error) => new Error(`Failed to fetch original message: ${error}`)
          });

          if (response.ok) {
            const msgJson: any = yield* Effect.promise(() => response.json());
            const messageId = msgJson.id;
            if (messageId) {
              const updatedState = {
                ...gameState,
                initialMessageId: messageId
              };
              yield* gameRepo.save(updatedState);
              yield* Effect.logInfo(`Saved initialMessageId ${messageId} for game ${gameState.gameId}`);
            }
          } else {
            yield* Effect.logError(`Failed to fetch original message. Status: ${response.status}`);
          }
        }).pipe(
          Effect.catchAll((error) =>
            Effect.logError(`Error in background task for fetching initial message: ${error}`)
          )
        );

        ctx.waitUntil(Effect.runPromise(getOriginalMessageTask));

        return gameState;
      }),

    roll: (gameId, playerId, holds, applicationId, token, ctx) =>
      Effect.gen(function* () {
        const gameRepo = yield* GameRepository;
        const serializer = yield* DiscordResponseSerializer;

        const gameStateOption = yield* gameRepo.findById(gameId);
        if (Option.isNone(gameStateOption)) {
          return yield* Effect.fail(new GameNotFoundError(gameId));
        }
        const gameState = gameStateOption.value;

        if (gameState.status === "Finished") {
          return yield* Effect.fail(new GameAlreadyOverError(gameId));
        }

        // Validate turn
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        if (currentPlayer.playerId !== playerId) {
          return yield* Effect.fail(new NotYourTurnError(currentPlayer.playerId, playerId));
        }

        const rollResult = rollDice(gameState, holds, rollProvider).pipe(
          Effect.catchTag("AllDiceHeldError", () =>
            Effect.fail(new InvalidStateActionError(KoreanMessages.errors.allDiceHeld))
          )
        );
        const apiService = yield* DiscordApiService;

        const nextStateRaw = yield* rollResult;
        const nextState = {
          ...nextStateRaw,
          lastMentionMessageId: undefined,
          lastMentionChannelId: undefined
        };
        yield* gameRepo.save(nextState);

        // Delete mention on action in background
        if (gameState.lastMentionMessageId && gameState.lastMentionChannelId) {
          const deleteMentionTask = apiService.deleteMessage(gameState.lastMentionChannelId, gameState.lastMentionMessageId).pipe(
            Effect.catchAll(() => Effect.void)
          );
          ctx.waitUntil(Effect.runPromise(deleteMentionTask));
        }

        yield* Effect.logInfo(`Dice rolled. Roll count: ${nextState.rollCount}/3, result: [${nextState.currentDice.join(", ")}]`);

        // Background task to patch main game board message
        const rollBgTask = Effect.gen(function* () {
          yield* Effect.sleep("1.2 seconds");
          const holdsStr = holds.map(h => h ? "1" : "0").join("");
          const finalPayload = serializer.serializeGame(nextState, holdsStr);
          
          yield* Effect.tryPromise({
            try: () =>
              fetch(`https://discord.com/api/v10/webhooks/${applicationId}/${token}/messages/@original`, {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(finalPayload.data)
              }),
            catch: (error) => new Error(`Failed to update interaction response: ${error}`)
          });
        }).pipe(
          Effect.catchAll((error) => 
            Effect.logError(`Error in background dice rolling task: ${error}`)
          ),
          Effect.annotateLogs("userId", playerId),
          Effect.annotateLogs("gameId", nextState.gameId)
        );

        ctx.waitUntil(Effect.runPromise(rollBgTask));

        return nextState;
      }),

    selectCategory: (gameId, playerId, category, guildId, channelId, messageId, ctx) =>
      Effect.gen(function* () {
        const gameRepo = yield* GameRepository;
        const playerRepo = yield* PlayerRepository;
        const matchRepo = yield* MatchRepository;
        const apiService = yield* DiscordApiService;
        const serializer = yield* DiscordResponseSerializer;
        const flyUrlOpt = yield* Effect.serviceOption(FlyBrainUrl);
        const flyUrl = Option.isSome(flyUrlOpt) ? flyUrlOpt.value : "";

        const gameStateOption = yield* gameRepo.findById(gameId);
        if (Option.isNone(gameStateOption)) {
          return yield* Effect.fail(new GameNotFoundError(gameId));
        }
        const gameState = gameStateOption.value;

        if (gameState.status === "Finished") {
          return yield* Effect.fail(new GameAlreadyOverError(gameId));
        }

        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        if (currentPlayer.playerId !== playerId) {
          return yield* Effect.fail(new NotYourTurnError(currentPlayer.playerId, playerId));
        }

        const scoredPoints = calculateScore(category, gameState.currentDice);
        yield* Effect.logInfo(`Category selected: ${category}, Points scored: ${scoredPoints}`);

        const nextState = yield* selectCategory(gameState, category);

        const handleGameEnd = (endedState: GameState) =>
          Effect.gen(function* () {
            const matchId = endedState.gameId;
            const mode = endedState.mode;
            const p1 = endedState.players[0];
            const p2 = endedState.mode === "multi" ? endedState.players[1] : null;

            let winnerId: string | null = null;
            if (endedState.surrenderedPlayerId) {
              if (mode === "multi" && p2) {
                winnerId = endedState.surrenderedPlayerId === p1.playerId ? p2.playerId : p1.playerId;
              } else {
                winnerId = null;
              }
            } else {
              if (mode === "multi" && p2) {
                if (p1.totalScore > p2.totalScore) {
                  winnerId = p1.playerId;
                } else if (p2.totalScore > p1.totalScore) {
                  winnerId = p2.playerId;
                }
              } else {
                winnerId = p1.playerId;
              }
            }

            let player1EloAfter: number | null = null;
            let player2EloAfter: number | null = null;
            let eloResult: { newRatingA: number; newRatingB: number; deltaA: number; deltaB: number } | null = null;

            if (mode === "multi" && p2) {
              const p1StatsOption = yield* playerRepo.getPlayer(p1.playerId, guildId);
              const p2StatsOption = yield* playerRepo.getPlayer(p2.playerId, guildId);
              const p1Elo = Option.isSome(p1StatsOption) ? p1StatsOption.value.elo : 1000;
              const p2Elo = Option.isSome(p2StatsOption) ? p2StatsOption.value.elo : 1000;

              let outcome: 0 | 0.5 | 1;
              if (endedState.surrenderedPlayerId) {
                outcome = endedState.surrenderedPlayerId === p1.playerId ? 0 : 1;
              } else {
                outcome = p1.totalScore > p2.totalScore ? 1 : (p2.totalScore > p1.totalScore ? 0 : 0.5);
              }
              eloResult = calculateEloChange(p1Elo, p2Elo, outcome);
              player1EloAfter = eloResult.newRatingA;
              player2EloAfter = eloResult.newRatingB;
            }

            const matchRecord = {
              id: matchId,
              mode,
              guildId: guildId,
              player1Id: p1.playerId,
              player2Id: p2 ? p2.playerId : null,
              player1Score: p1.totalScore,
              player2Score: p2 ? p2.totalScore : null,
              winnerId,
              surrenderedId: endedState.surrenderedPlayerId || null,
              playedAt: new Date(),
              historyJson: JSON.stringify(endedState.turnHistory),
              player1EloAfter,
              player2EloAfter
            };

            yield* matchRepo.saveMatch(matchRecord);
            yield* Effect.logInfo(`Game finished. Winner: ${winnerId || "Draw"}. Match record saved to D1.`);

            let endMsgContent = "";

            if (mode === "single") {
              yield* playerRepo.updateStats(p1.playerId, guildId, "single", "win", p1.totalScore);
              yield* Effect.logInfo(`Updated stats for Player 1: ${p1.playerId} (single)`);

              if (endedState.surrenderedPlayerId) {
                endMsgContent = KoreanMessages.gameEnd.singleSurrendered(p1.playerId, p1.totalScore);
              } else {
                endMsgContent = KoreanMessages.gameEnd.singleFinished(p1.playerId, p1.totalScore);
              }
            } else if (p2 && eloResult) {
              yield* playerRepo.updateElo(p1.playerId, guildId, eloResult.newRatingA);
              yield* playerRepo.updateElo(p2.playerId, guildId, eloResult.newRatingB);
              yield* Effect.logInfo(`Updated Elo ratings. P1: ${eloResult.newRatingA}, P2: ${eloResult.newRatingB}`);

              if (endedState.surrenderedPlayerId) {
                if (endedState.surrenderedPlayerId === p1.playerId) {
                  yield* playerRepo.updateStats(p1.playerId, guildId, "multi", "loss", p1.totalScore);
                  yield* playerRepo.updateStats(p2.playerId, guildId, "multi", "win", p2.totalScore);
                } else {
                  yield* playerRepo.updateStats(p1.playerId, guildId, "multi", "win", p1.totalScore);
                  yield* playerRepo.updateStats(p2.playerId, guildId, "multi", "loss", p2.totalScore);
                }
              } else {
                if (p1.totalScore > p2.totalScore) {
                  yield* playerRepo.updateStats(p1.playerId, guildId, "multi", "win", p1.totalScore);
                  yield* playerRepo.updateStats(p2.playerId, guildId, "multi", "loss", p2.totalScore);
                } else if (p2.totalScore > p1.totalScore) {
                  yield* playerRepo.updateStats(p1.playerId, guildId, "multi", "loss", p1.totalScore);
                  yield* playerRepo.updateStats(p2.playerId, guildId, "multi", "win", p2.totalScore);
                } else {
                  yield* playerRepo.updateStats(p1.playerId, guildId, "multi", "draw", p1.totalScore);
                  yield* playerRepo.updateStats(p2.playerId, guildId, "multi", "draw", p2.totalScore);
                }
              }

              const formatDelta = (d: number) => d >= 0 ? `▲+${d}` : `▼${d}`;
              const deltaA = formatDelta(eloResult.deltaA);
              const deltaB = formatDelta(eloResult.deltaB);

              if (endedState.surrenderedPlayerId) {
                endMsgContent = getMultiSurrenderMessage(p1.playerId, p2.playerId, endedState.surrenderedPlayerId, eloResult.newRatingA, eloResult.newRatingB, deltaA, deltaB);
              } else {
                if (p1.totalScore === p2.totalScore) {
                  endMsgContent = getMultiDrawMessage(p1.playerId, p2.playerId, p1.totalScore, eloResult.newRatingA, eloResult.newRatingB, deltaA, deltaB);
                } else {
                  endMsgContent = getMultiFinishedMessage(p1.playerId, p2.playerId, p1.totalScore, p2.totalScore, eloResult.newRatingA, eloResult.newRatingB, deltaA, deltaB);
                }
              }
            }

            if (channelId && endMsgContent) {
              const endMessageTask = apiService.sendGameEndMessage(channelId, endMsgContent, messageId).pipe(
                Effect.catchAll((err) => Effect.logError(`Error sending game end message: ${err}`))
              );
              ctx.waitUntil(Effect.runPromise(endMessageTask));
            }
          });

        if (nextState.status === "Finished") {
          yield* handleGameEnd(nextState);
          yield* gameRepo.delete(nextState.gameId);
          yield* Effect.logInfo(`Game finished. Deleted active game ${nextState.gameId}`);
        } else {
          yield* gameRepo.save(nextState);
        }

        // Send turn mention / delete previous mention in background
        if (nextState.mode === "multi" && nextState.status !== "Finished" && channelId) {
          const nextPlayerId = nextState.players[nextState.currentPlayerIndex].playerId;
          if (nextPlayerId === FLY_AI_PLAYER_ID) {
            if (gameState.lastMentionMessageId && gameState.lastMentionChannelId) {
              const deleteMentionTask = apiService.deleteMessage(gameState.lastMentionChannelId, gameState.lastMentionMessageId).pipe(
                Effect.catchAll(() => Effect.void)
              );
              ctx.waitUntil(Effect.runPromise(deleteMentionTask));
            }
            const aiTask = executeAiTurnLogic(
              nextState.gameId,
              guildId,
              channelId,
              messageId || gameState.initialMessageId || ""
            ).pipe(
              Effect.catchAll((err) => {
                console.error(`[Fly AI] Error executing AI turn for game ${nextState.gameId}:`, err);
                return Effect.logError(`Error executing AI turn: ${err}`);
              }),
              Effect.provide(
                Layer.mergeAll(
                  Layer.succeed(GameRepository, gameRepo),
                  Layer.succeed(PlayerRepository, playerRepo),
                  Layer.succeed(MatchRepository, matchRepo),
                  Layer.succeed(DiscordApiService, apiService),
                  Layer.succeed(DiscordResponseSerializer, serializer),
                  Layer.succeed(FlyBrainUrl, flyUrl)
                )
              )
            );
            ctx.waitUntil(Effect.runPromise(aiTask));
          } else {
            const sendMentionTask = Effect.gen(function* () {
              if (gameState.lastMentionMessageId && gameState.lastMentionChannelId) {
                yield* apiService.deleteMessage(gameState.lastMentionChannelId, gameState.lastMentionMessageId);
              }
              const newMsgId = yield* apiService.sendMention(channelId, nextPlayerId, messageId);
              if (newMsgId) {
                const stateWithMention = {
                  ...nextState,
                  lastMentionMessageId: newMsgId,
                  lastMentionChannelId: channelId
                };
                yield* gameRepo.save(stateWithMention);
              }
            }).pipe(
              Effect.catchAll((err) => 
                Effect.logError(`Error sending turn mention: ${err}`)
              )
            );
            ctx.waitUntil(Effect.runPromise(sendMentionTask));
          }
        } else {
          if (gameState.lastMentionMessageId && gameState.lastMentionChannelId) {
            const deleteMentionTask = apiService.deleteMessage(gameState.lastMentionChannelId, gameState.lastMentionMessageId).pipe(
              Effect.catchAll(() => Effect.void)
            );
            ctx.waitUntil(Effect.runPromise(deleteMentionTask));
          }
        }

        // Yacht & Teasing Notification Task
        if (channelId) {
          const notifyTask = Effect.gen(function* () {
            const notificationContent = determineTeasingNotification(gameState, nextState);
            if (notificationContent) {
              yield* apiService.sendGameEndMessage(channelId, notificationContent, messageId);
            }
          }).pipe(
            Effect.catchAll((err) => 
              Effect.logError(`Error sending gameplay notification: ${err}`)
            )
          );
          ctx.waitUntil(Effect.runPromise(notifyTask));
        }

        return nextState;
      }),

    surrender: (gameId, playerId, guildId, channelId, messageId, ctx) =>
      processSurrender(gameId, playerId, guildId, channelId, messageId, ctx),

    offerSurrender: (gameId, playerId) =>
      Effect.gen(function* () {
        const gameRepo = yield* GameRepository;
        const gameStateOption = yield* gameRepo.findById(gameId);
        if (Option.isNone(gameStateOption)) {
          return yield* Effect.fail(new GameNotFoundError(gameId));
        }
        const gameState = gameStateOption.value;

        const nextState = yield* domainOfferSurrender(gameState, playerId);
        yield* gameRepo.save(nextState);
        return nextState;
      }),

    acceptSurrender: (gameId, playerId, guildId, channelId, messageId, ctx) =>
      Effect.gen(function* () {
        const gameRepo = yield* GameRepository;
        const gameStateOption = yield* gameRepo.findById(gameId);
        if (Option.isNone(gameStateOption)) {
          return yield* Effect.fail(new GameNotFoundError(gameId));
        }
        const gameState = gameStateOption.value;

        const proposerId = gameState.pendingSurrenderOfferByPlayerId;
        if (!proposerId) {
          return yield* Effect.fail(
            new InvalidStateActionError("No pending surrender offer to accept.")
          );
        }

        yield* domainAcceptSurrender(gameState, playerId);

        return yield* processSurrender(
          gameId,
          proposerId,
          guildId,
          channelId,
          messageId,
          ctx,
          proposerId
        );
      }),

    declineSurrender: (gameId, playerId) =>
      Effect.gen(function* () {
        const gameRepo = yield* GameRepository;
        const gameStateOption = yield* gameRepo.findById(gameId);
        if (Option.isNone(gameStateOption)) {
          return yield* Effect.fail(new GameNotFoundError(gameId));
        }
        const gameState = gameStateOption.value;

        const nextState = yield* domainDeclineSurrender(gameState, playerId);
        yield* gameRepo.save(nextState);
        return nextState;
      }),

    createInvitation: (challengerId, challengerName, opponentId, opponentName, guildId, channelId) =>
      Effect.gen(function* () {
        const invRepo = yield* InvitationRepository;
        const gameRepo = yield* GameRepository;
        const playerRepo = yield* PlayerRepository;

        const activeGameOpt = yield* gameRepo.findActiveGameByPlayers(challengerId, opponentId);
        if (Option.isSome(activeGameOpt)) {
          const activeGame = activeGameOpt.value;
          return yield* Effect.fail(new ActiveGameExistsError(activeGame.initialMessageId, guildId, channelId));
        }

        const activeInvOpt = yield* invRepo.findActiveBetweenPlayers(challengerId, opponentId);
        if (Option.isSome(activeInvOpt)) {
          return yield* Effect.fail(new ActiveInvitationExistsError());
        }

        yield* playerRepo.upsertPlayer(challengerId, challengerName);
        yield* playerRepo.upsertPlayer(opponentId, opponentName);

        const invitation: Invitation = {
          id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          challengerId,
          challengerName,
          opponentId,
          opponentName,
          guildId,
          channelId,
          status: "PENDING",
          createdAt: Date.now()
        };

        yield* invRepo.save(invitation);
        return invitation;
      }),

    acceptInvitation: (invitationId, userId, userName, guildId, channelId) =>
      Effect.gen(function* () {
        const invRepo = yield* InvitationRepository;
        const gameRepo = yield* GameRepository;
        const playerRepo = yield* PlayerRepository;

        const invOpt = yield* invRepo.findById(invitationId);
        if (Option.isNone(invOpt)) {
          return yield* Effect.fail(new InvitationNotFoundError());
        }

        const inv = invOpt.value;
        if (inv.opponentId !== userId) {
          return yield* Effect.fail(new UnauthorizedInvitationError());
        }

        if (inv.status !== "PENDING") {
          return yield* Effect.fail(new InvitationNotFoundError());
        }

        if (isInvitationExpired(inv)) {
          yield* invRepo.updateStatus(inv.id, "EXPIRED");
          return yield* Effect.fail(new InvitationExpiredError());
        }

        yield* invRepo.updateStatus(inv.id, "ACCEPTED");

        yield* playerRepo.upsertPlayer(inv.challengerId, inv.challengerName);
        yield* playerRepo.upsertPlayer(userId, userName);

        const players = [
          { playerId: inv.challengerId, playerName: inv.challengerName },
          { playerId: userId, playerName: userName }
        ];

        const gameState = yield* initGame(players, "multi");
        yield* gameRepo.save(gameState);
        return gameState;
      }),

    declineInvitation: (invitationId, userId) =>
      Effect.gen(function* () {
        const invRepo = yield* InvitationRepository;
        const invOpt = yield* invRepo.findById(invitationId);
        if (Option.isNone(invOpt)) {
          return yield* Effect.fail(new InvitationNotFoundError());
        }

        const inv = invOpt.value;
        if (inv.opponentId !== userId) {
          return yield* Effect.fail(new UnauthorizedInvitationError());
        }

        if (inv.status !== "PENDING") {
          return yield* Effect.fail(new InvitationNotFoundError());
        }

        if (isInvitationExpired(inv)) {
          yield* invRepo.updateStatus(inv.id, "EXPIRED");
          return yield* Effect.fail(new InvitationExpiredError());
        }

        yield* invRepo.updateStatus(inv.id, "DECLINED");
        return { ...inv, status: "DECLINED" as const };
      }),

    createMatchQueue: (hostId, hostName, guildId, channelId) =>
      Effect.gen(function* () {
        const queueRepo = yield* MatchQueueRepository;
        const playerRepo = yield* PlayerRepository;

        const activeOpt = yield* queueRepo.findActiveByHost(hostId, guildId, channelId);
        if (Option.isSome(activeOpt)) {
          return yield* Effect.fail(new ActiveMatchQueueExistsError());
        }

        yield* playerRepo.upsertPlayer(hostId, hostName);

        const queue: MatchQueue = {
          id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          hostId,
          hostName,
          guildId,
          channelId,
          status: "WAITING",
          createdAt: Date.now()
        };

        yield* queueRepo.save(queue);
        return queue;
      }),

    joinMatchQueue: (queueId, guestId, guestName, guildId, channelId) =>
      Effect.gen(function* () {
        const queueRepo = yield* MatchQueueRepository;
        const gameRepo = yield* GameRepository;
        const playerRepo = yield* PlayerRepository;

        const queueOpt = yield* queueRepo.findById(queueId);
        if (Option.isNone(queueOpt)) {
          return yield* Effect.fail(new MatchQueueNotFoundError());
        }

        const queue = queueOpt.value;
        if (queue.hostId === guestId) {
          return yield* Effect.fail(new SelfJoinQueueError());
        }

        if (queue.status !== "WAITING") {
          return yield* Effect.fail(new MatchQueueNotFoundError());
        }

        if (isMatchQueueExpired(queue)) {
          yield* queueRepo.updateStatus(queue.id, "EXPIRED");
          return yield* Effect.fail(new MatchQueueExpiredError());
        }

        yield* queueRepo.updateStatus(queue.id, "MATCHED");

        yield* playerRepo.upsertPlayer(queue.hostId, queue.hostName);
        yield* playerRepo.upsertPlayer(guestId, guestName);

        const players = [
          { playerId: queue.hostId, playerName: queue.hostName },
          { playerId: guestId, playerName: guestName }
        ];

        const gameState = yield* initGame(players, "multi");
        yield* gameRepo.save(gameState);
        return gameState;
      }),

    cancelMatchQueue: (queueId, userId) =>
      Effect.gen(function* () {
        const queueRepo = yield* MatchQueueRepository;

        const queueOpt = yield* queueRepo.findById(queueId);
        if (Option.isNone(queueOpt)) {
          return yield* Effect.fail(new MatchQueueNotFoundError());
        }

        const queue = queueOpt.value;
        if (queue.hostId !== userId) {
          return yield* Effect.fail(new UnauthorizedCancelQueueError());
        }

        if (queue.status !== "WAITING") {
          return yield* Effect.fail(new MatchQueueNotFoundError());
        }

        yield* queueRepo.updateStatus(queue.id, "CANCELLED");
        return { ...queue, status: "CANCELLED" as const };
      }),

    playWithFlyAiFromQueue: (queueId, userId, guildId, channelId, messageId) =>
      Effect.gen(function* () {
        const queueRepo = yield* MatchQueueRepository;
        const gameRepo = yield* GameRepository;
        const playerRepo = yield* PlayerRepository;

        const queueOpt = yield* queueRepo.findById(queueId);
        if (Option.isNone(queueOpt)) {
          return yield* Effect.fail(new MatchQueueNotFoundError());
        }

        const queue = queueOpt.value;
        if (queue.hostId !== userId) {
          return yield* Effect.fail(new UnauthorizedPlayAiError());
        }

        if (queue.status !== "WAITING") {
          return yield* Effect.fail(new MatchQueueNotFoundError());
        }

        if (isMatchQueueExpired(queue)) {
          yield* queueRepo.updateStatus(queue.id, "EXPIRED");
          return yield* Effect.fail(new MatchQueueExpiredError());
        }

        yield* queueRepo.updateStatus(queue.id, "MATCHED");

        yield* playerRepo.upsertPlayer(queue.hostId, queue.hostName);
        yield* playerRepo.upsertPlayer(FLY_AI_PLAYER_ID, FLY_AI_PLAYER_NAME);

        const players = [
          { playerId: queue.hostId, playerName: queue.hostName },
          { playerId: FLY_AI_PLAYER_ID, playerName: FLY_AI_PLAYER_NAME }
        ];

        const gameState = yield* initGame(players, "multi");
        const stateWithMsg = messageId ? { ...gameState, initialMessageId: messageId } : gameState;
        yield* gameRepo.save(stateWithMsg);
        return stateWithMsg;
      }),

    playWithFlyAiFromInvitation: (invitationId, userId, guildId, channelId, messageId) =>
      Effect.gen(function* () {
        const invRepo = yield* InvitationRepository;
        const gameRepo = yield* GameRepository;
        const playerRepo = yield* PlayerRepository;

        const invOpt = yield* invRepo.findById(invitationId);
        if (Option.isNone(invOpt)) {
          return yield* Effect.fail(new InvitationNotFoundError());
        }

        const inv = invOpt.value;
        if (inv.challengerId !== userId) {
          return yield* Effect.fail(new UnauthorizedPlayAiError());
        }

        if (inv.status !== "PENDING") {
          return yield* Effect.fail(new InvitationNotFoundError());
        }

        if (isInvitationExpired(inv)) {
          yield* invRepo.updateStatus(inv.id, "EXPIRED");
          return yield* Effect.fail(new InvitationExpiredError());
        }

        yield* invRepo.updateStatus(inv.id, "ACCEPTED");

        yield* playerRepo.upsertPlayer(inv.challengerId, inv.challengerName);
        yield* playerRepo.upsertPlayer(FLY_AI_PLAYER_ID, FLY_AI_PLAYER_NAME);

        const players = [
          { playerId: inv.challengerId, playerName: inv.challengerName },
          { playerId: FLY_AI_PLAYER_ID, playerName: FLY_AI_PLAYER_NAME }
        ];

        const gameState = yield* initGame(players, "multi");
        const stateWithMsg = messageId ? { ...gameState, initialMessageId: messageId } : gameState;
        yield* gameRepo.save(stateWithMsg);
        return stateWithMsg;
      }),

    executeAiTurn: (gameId, guildId, channelId, messageId) =>
      executeAiTurnLogic(gameId, guildId, channelId, messageId),

    createColosseumMatch: (guildId, channelId) =>
      Effect.gen(function* () {
        const colosseumRepo = yield* ColosseumRepository;
        const [pA, pB] = selectRandomGladiators();
        const { oddsA, oddsB } = calculateOdds(pA.elo, pB.elo);

        const matchId = `colosseum_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const matchRecord: ColosseumMatchRecord = {
          id: matchId,
          guildId,
          channelId,
          personaAId: pA.id,
          personaBId: pB.id,
          oddsA,
          oddsB,
          status: "BETTING",
          createdAt: new Date()
        };

        yield* colosseumRepo.createMatch(matchRecord);
        return matchRecord;
      }),

    placeColosseumBet: (matchId, userId, userName, guildId, chosenPersona, amount) =>
      Effect.gen(function* () {
        const colosseumRepo = yield* ColosseumRepository;
        const playerRepo = yield* PlayerRepository;

        const matchOpt = yield* colosseumRepo.getMatchById(matchId);
        if (Option.isNone(matchOpt)) {
          return yield* Effect.fail(new ColosseumMatchNotFoundError());
        }
        const match = matchOpt.value;
        if (match.status !== "BETTING") {
          return yield* Effect.fail(new ColosseumBetClosedError());
        }

        const existingBet = yield* colosseumRepo.getUserBetInMatch(matchId, userId);
        if (Option.isSome(existingBet)) {
          return yield* Effect.fail(new ColosseumAlreadyBetError());
        }

        const playerOpt = yield* playerRepo.getPlayer(userId, guildId);
        const currentElo = Option.isSome(playerOpt) ? playerOpt.value.elo : 1000;

        const validateResult = validateBet(currentElo, amount);
        if (validateResult._tag === "Left") {
          return yield* Effect.fail(validateResult.left);
        }
        const validAmount = validateResult.right;

        yield* playerRepo.upsertPlayer(userId, userName);
        yield* playerRepo.updateElo(userId, guildId, currentElo - validAmount);

        const odds = chosenPersona === "A" ? match.oddsA : match.oddsB;
        const betId = `bet_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const betRecord: ColosseumBetRecord = {
          id: betId,
          matchId,
          userId,
          userName,
          chosenPersona,
          amount: validAmount,
          odds,
          payout: 0,
          status: "PENDING",
          createdAt: new Date()
        };

        yield* colosseumRepo.placeBet(betRecord);
        const allBets = yield* colosseumRepo.getBetsByMatchId(matchId);

        return {
          match,
          bet: betRecord,
          allBets
        };
      }),

    startColosseumDuel: (matchId, channelId, messageId, ctx) =>
      Effect.gen(function* () {
        const colosseumRepo = yield* ColosseumRepository;
        const playerRepo = yield* PlayerRepository;
        const apiService = yield* DiscordApiService;
        const serializer = yield* DiscordResponseSerializer;
        const flyUrlOpt = yield* Effect.serviceOption(FlyBrainUrl);
        const flyUrl = Option.isSome(flyUrlOpt) ? flyUrlOpt.value : "";

        const matchOpt = yield* colosseumRepo.getMatchById(matchId);
        if (Option.isNone(matchOpt)) {
          return yield* Effect.fail(new ColosseumMatchNotFoundError());
        }
        const match = matchOpt.value;
        if (match.status !== "BETTING") {
          return match;
        }

        yield* colosseumRepo.updateMatchStatus(matchId, "SIMULATING", messageId);
        const updatedMatch: ColosseumMatchRecord = { ...match, status: "SIMULATING", messageId };

        const simTask = executeColosseumMatchLogic(matchId, channelId, messageId).pipe(
          Effect.catchAll((err) => {
            console.error(`[Colosseum] Error executing duel ${matchId}:`, err);
            return Effect.logError(`Error executing colosseum duel: ${err}`);
          }),
          Effect.provide(
            Layer.mergeAll(
              Layer.succeed(ColosseumRepository, colosseumRepo),
              Layer.succeed(PlayerRepository, playerRepo),
              Layer.succeed(DiscordApiService, apiService),
              Layer.succeed(DiscordResponseSerializer, serializer),
              Layer.succeed(FlyBrainUrl, flyUrl)
            )
          )
        );
        ctx.waitUntil(Effect.runPromise(simTask));

        return updatedMatch;
      }),

    executeColosseumMatch: (matchId, channelId, messageId) =>
      executeColosseumMatchLogic(matchId, channelId, messageId)
  }
);

const executeColosseumMatchLogic = (
  matchId: string,
  channelId: string,
  messageId: string
) =>
  Effect.gen(function* () {
    const colosseumRepo = yield* ColosseumRepository;
    const playerRepo = yield* PlayerRepository;
    const apiService = yield* DiscordApiService;
    const serializer = yield* DiscordResponseSerializer;
    const flyUrlOpt = yield* Effect.serviceOption(FlyBrainUrl);
    const flyUrl = Option.isSome(flyUrlOpt) ? flyUrlOpt.value : "";

    const matchOpt = yield* colosseumRepo.getMatchById(matchId);
    if (Option.isNone(matchOpt)) return;
    const match = matchOpt.value;
    if (match.status === "COMPLETED" || match.status === "CANCELLED") return;

    // 1. Fetch simulation duel timeline from Python SNN server
    const duelData = yield* Effect.tryPromise({
      try: async () => {
        if (!flyUrl) throw new Error("FLY_BRAIN_URL not configured");
        const res = await fetch(`${flyUrl}/api/fly/duel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            persona_a: match.personaAId,
            persona_b: match.personaBId
          })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as any;
      },
      catch: (err) => err
    }).pipe(
      Effect.catchAll(() => {
        const categories = ["Aces", "Deuces", "Treys", "Fours", "Fives", "Sixes", "Choice", "FourOfAKind", "FullHouse", "SmallStraight", "LargeStraight", "Yacht"];
        const mockRounds = Array.from({ length: 12 }, (_, i) => {
          const cat = categories[i];
          const ptsA = i === 11 ? 50 : 15;
          const ptsB = 14;
          const sbA: Record<string, number> = {};
          const sbB: Record<string, number> = {};
          for (let j = 0; j <= i; j++) {
            const c = categories[j];
            sbA[c] = j === 11 ? 50 : 15;
            sbB[c] = 14;
          }
          return {
            round: i + 1,
            a: {
              category: cat,
              points: ptsA,
              total: 15 * i + ptsA,
              dopamine: 120 + i * 10,
              dialogue: "🔥🔥 도파민 풀악셀 가즈아 붕!!",
              dice: [5, 5, 5, 5, 5],
              holds: [true, true, true, true, true],
              score_board: sbA,
              upper_bonus: 0
            },
            b: {
              category: cat,
              points: ptsB,
              total: ptsB * (i + 1),
              dopamine: 110,
              dialogue: "🧊 오차범위 0.01% 계산 완료 붕.",
              dice: [4, 4, 4, 3, 2],
              holds: [true, true, true, false, false],
              score_board: sbB,
              upper_bonus: 0
            },
            leader: "A",
            is_lead_change: false
          };
        });
        return Effect.succeed({
          winner: "A",
          score_a: 215,
          score_b: 168,
          diff: 47,
          lead_changes: 0,
          rounds: mockRounds
        });
      })
    );

    const bets = yield* colosseumRepo.getBetsByMatchId(matchId);

    // 2. Play out 4 dramatic acts (R03, R06, R09, R12) with 2-stage suspense:
    // Total sleep budgeted at 17.0s (Acts 1-3: 2.0s+2.5s, Act 4: 2.0s+1.5s) to safely fit within Cloudflare 30s waitUntil limit.
    for (let act = 1; act <= 4; act++) {
      // Stage A: Rolling Suspense with animated GIF
      const rollingPayload = serializer.serializeColosseumRolling(match, bets, duelData, act, flyUrl);
      yield* apiService.editMessage(channelId, messageId, rollingPayload.data).pipe(
        Effect.catchAll((err) => {
          console.error(`[Colosseum] Failed to edit rolling message (act ${act}):`, err);
          return Effect.void;
        })
      );
      yield* Effect.sleep("2 seconds");

      // Stage B: Dice Impact & Scoreboard Update
      const clashPayload = serializer.serializeColosseumClash(match, bets, duelData, act, flyUrl);
      yield* apiService.editMessage(channelId, messageId, clashPayload.data).pipe(
        Effect.catchAll((err) => {
          console.error(`[Colosseum] Failed to edit clash message (act ${act}):`, err);
          return Effect.void;
        })
      );
      // For Act 4, a shorter 1.5s pause before immediately presenting the final settlement
      yield* Effect.sleep(act === 4 ? "1.5 seconds" : "2.5 seconds");
    }

    // 4. Phase 3: Settle Bets & Final Results
    const winner = duelData.winner as "A" | "B" | "DRAW";
    yield* colosseumRepo.finishMatch(
      match.id,
      winner,
      duelData.score_a,
      duelData.score_b,
      JSON.stringify(duelData)
    );

    for (const bet of bets) {
      if (winner === "DRAW") {
        yield* colosseumRepo.updateBetPayout(bet.id, bet.amount, "REFUNDED");
        const pOpt = yield* playerRepo.getPlayer(bet.userId, match.guildId);
        if (Option.isSome(pOpt)) {
          yield* playerRepo.updateElo(bet.userId, match.guildId, pOpt.value.elo + bet.amount);
        }
      } else if (winner === bet.chosenPersona) {
        const payout = Math.floor(bet.amount * bet.odds);
        yield* colosseumRepo.updateBetPayout(bet.id, payout, "WON");
        const pOpt = yield* playerRepo.getPlayer(bet.userId, match.guildId);
        if (Option.isSome(pOpt)) {
          yield* playerRepo.updateElo(bet.userId, match.guildId, pOpt.value.elo + payout);
        }
      } else {
        yield* colosseumRepo.updateBetPayout(bet.id, 0, "LOST");
      }
    }

    const updatedBets = yield* colosseumRepo.getBetsByMatchId(matchId);
    const updatedMatchOpt = yield* colosseumRepo.getMatchById(matchId);
    const finalMatch = Option.getOrElse(updatedMatchOpt, () => match);

    const phase3Payload = serializer.serializeColosseumResult(finalMatch, updatedBets, duelData, flyUrl);
    yield* apiService.editMessage(channelId, messageId, phase3Payload.data).pipe(
      Effect.catchAll((err) => {
        console.error(`[Colosseum] Failed to edit final result message for match ${matchId}:`, err);
        return Effect.void;
      })
    );
  });



