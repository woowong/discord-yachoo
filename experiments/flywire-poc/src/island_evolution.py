import copy
import time
from dataclasses import dataclass
from typing import Callable, Dict, List, Optional, Tuple
import numpy as np
import scipy.sparse as sp

from forward_sim import FlySubcircuitSNN, load_cached_subcircuit
from agent import FlyBrainAgent
from run_game import play_single_game
from synaptic_plasticity import (
    extract_kc_mbon_dense,
    set_kc_mbon_dense,
    mutate_weights,
    crossover_weights,
)
from evolution import Individual


@dataclass
class IslandConfig:
    name: str
    bias_mode: str
    pop_size: int = 12
    elite_count: int = 2
    tournament_k: int = 3
    base_mutation_rate: float = 0.08
    base_mutation_sigma: float = 0.06
    stagnation_threshold: int = 5
    hypermutation_multiplier: float = 2.0


def evaluate_individual_island(
    ind: Individual,
    base_adj: sp.csr_matrix,
    metadata: Dict,
    num_games: int = 6,
    bias_mode: str = "balanced",
) -> float:
    """
    Evaluates an individual under an island-specific fitness landscape.
    """
    adj = set_kc_mbon_dense(base_adj, metadata, ind.weights, preserve_topology=True)
    snn = FlySubcircuitSNN(adj, metadata)
    agent = FlyBrainAgent(snn=snn, sim_steps=12, pulse_steps=3)
    
    total_scores = []
    upper_bonuses = 0
    yacht_hits = 0
    large_straight_hits = 0
    full_house_hits = 0
    small_straight_hits = 0
    four_kind_hits = 0
    zero_count = 0
    upper_sums = []
    
    for _ in range(num_games):
        game_res = play_single_game(agent, verbose=False)
        total_scores.append(game_res["total_score"])
        upper_sums.append(game_res["upper_sum"])
        if game_res["upper_bonus"] > 0:
            upper_bonuses += 1
            
        board = game_res["score_board"]
        if board.get("Yacht", 0) == 50:
            yacht_hits += 1
        if board.get("LargeStraight", 0) == 30:
            large_straight_hits += 1
        if board.get("SmallStraight", 0) == 15:
            small_straight_hits += 1
        if board.get("FullHouse", 0) > 0:
            full_house_hits += 1
        if board.get("FourOfAKind", 0) > 0:
            four_kind_hits += 1
            
        zero_count += sum(1 for pts in board.values() if pts == 0)
        
    mean_score = float(np.mean(total_scores))
    max_score = int(np.max(total_scores))
    min_score = int(np.min(total_scores))
    upper_rate = upper_bonuses / num_games
    yacht_rate = yacht_hits / num_games
    straight_rate = (small_straight_hits + large_straight_hits) / num_games
    full_house_rate = full_house_hits / num_games
    four_kind_rate = four_kind_hits / num_games
    avg_zeros = zero_count / num_games
    
    # Island-specific fitness calculation
    if bias_mode == "jackpot":
        fitness = mean_score + (50.0 * yacht_rate) + (25.0 * straight_rate) + (20.0 * four_kind_rate)
    elif bias_mode == "upper_bonus":
        avg_upper_sum = float(np.mean(upper_sums))
        fitness = mean_score + (60.0 * upper_rate) + (avg_upper_sum / 63.0) * 20.0
    elif bias_mode == "balanced":
        fitness = mean_score - (4.0 * avg_zeros) + (20.0 * full_house_rate) + (25.0 * upper_rate)
    elif bias_mode == "hypermutation":
        fitness = mean_score + (35.0 * upper_rate) + (35.0 * yacht_rate)
    elif bias_mode == "high_roller":
        fitness = 0.5 * mean_score + 0.5 * max_score + (30.0 * yacht_rate)
    elif bias_mode == "straight":
        fitness = mean_score + (60.0 * straight_rate) + (20.0 * upper_rate)
    elif bias_mode == "full_house":
        fitness = mean_score + (50.0 * full_house_rate) + (30.0 * four_kind_rate)
    else:
        fitness = mean_score + (40.0 * yacht_rate) + (40.0 * upper_rate) + (20.0 * straight_rate)
        
    ind.fitness = float(fitness)
    ind.stats = {
        "mean_score": mean_score,
        "max_score": max_score,
        "min_score": min_score,
        "upper_bonus_rate": upper_rate,
        "yacht_count": yacht_hits,
        "full_house_count": full_house_hits,
        "straight_count": small_straight_hits + large_straight_hits,
        "four_kind_count": four_kind_hits,
        "zero_scores": zero_count,
    }
    return ind.fitness


_WORKER_ADJ = None
_WORKER_META = None


def _init_eval_worker(base_adj: sp.csr_matrix, metadata: Dict):
    global _WORKER_ADJ, _WORKER_META
    _WORKER_ADJ = base_adj
    _WORKER_META = metadata


def _eval_task_worker(task: Tuple[int, int, np.ndarray, int, str]) -> Tuple[int, int, float, Dict]:
    isl_idx, ind_idx, weights, games_per_eval, bias_mode = task
    adj = set_kc_mbon_dense(_WORKER_ADJ, _WORKER_META, weights, preserve_topology=True)
    snn = FlySubcircuitSNN(adj, _WORKER_META)
    agent = FlyBrainAgent(snn=snn, sim_steps=12, pulse_steps=3)
    
    total_scores = []
    upper_bonuses = 0
    yacht_hits = 0
    large_straight_hits = 0
    full_house_hits = 0
    small_straight_hits = 0
    four_kind_hits = 0
    zero_count = 0
    upper_sums = []
    
    for _ in range(games_per_eval):
        game_res = play_single_game(agent, verbose=False)
        total_scores.append(game_res["total_score"])
        upper_sums.append(game_res["upper_sum"])
        if game_res["upper_bonus"] > 0:
            upper_bonuses += 1
            
        board = game_res["score_board"]
        if board["Yacht"] == 50: yacht_hits += 1
        if board["LargeStraight"] == 30: large_straight_hits += 1
        if board["SmallStraight"] == 15: small_straight_hits += 1
        if board["FullHouse"] > 0: full_house_hits += 1
        if board["FourOfAKind"] > 0: four_kind_hits += 1
        zero_count += sum(1 for pts in board.values() if pts == 0)
        
    mean_score = float(np.mean(total_scores))
    max_score = int(np.max(total_scores))
    min_score = int(np.min(total_scores))
    upper_rate = upper_bonuses / games_per_eval
    yacht_rate = yacht_hits / games_per_eval
    straight_rate = (small_straight_hits + large_straight_hits) / games_per_eval
    full_house_rate = full_house_hits / games_per_eval
    four_kind_rate = four_kind_hits / games_per_eval
    avg_zeros = zero_count / games_per_eval
    
    if bias_mode == "jackpot":
        fitness = mean_score + (50.0 * yacht_rate) + (25.0 * straight_rate) + (20.0 * four_kind_rate)
    elif bias_mode == "upper_bonus":
        avg_upper_sum = float(np.mean(upper_sums))
        fitness = mean_score + (60.0 * upper_rate) + (avg_upper_sum / 63.0) * 20.0
    elif bias_mode == "balanced":
        fitness = mean_score - (4.0 * avg_zeros) + (20.0 * full_house_rate) + (25.0 * upper_rate)
    elif bias_mode == "hypermutation":
        fitness = mean_score + (35.0 * upper_rate) + (35.0 * yacht_rate)
    elif bias_mode == "high_roller":
        fitness = 0.5 * mean_score + 0.5 * max_score + (30.0 * yacht_rate)
    elif bias_mode == "conservative":
        fitness = mean_score + 0.5 * min_score - (5.0 * avg_zeros) + (15.0 * upper_rate)
    elif bias_mode == "straight":
        fitness = mean_score + (60.0 * straight_rate) + (20.0 * upper_rate)
    elif bias_mode == "full_house":
        fitness = mean_score + (50.0 * full_house_rate) + (30.0 * four_kind_rate)
    else:
        fitness = mean_score + (40.0 * yacht_rate) + (40.0 * upper_rate) + (20.0 * straight_rate)
        
    stats = {
        "mean_score": mean_score,
        "max_score": max_score,
        "min_score": min_score,
        "upper_bonus_rate": upper_rate,
        "yacht_count": yacht_hits,
        "full_house_count": full_house_hits,
        "straight_count": small_straight_hits + large_straight_hits,
        "four_kind_count": four_kind_hits,
        "zero_scores": zero_count,
    }
    return isl_idx, ind_idx, float(fitness), stats


class Island:
    def __init__(
        self,
        config: IslandConfig,
        initial_weights: np.ndarray,
        base_adj: sp.csr_matrix,
        metadata: Dict,
        seed: int = 42,
    ):
        self.config = config
        self.base_adj = base_adj
        self.metadata = metadata
        self.rng = np.random.default_rng(seed)
        
        self.current_sigma = config.base_mutation_sigma
        self.current_rate = config.base_mutation_rate
        self.stagnation_counter = 0
        self.best_historical_fitness = -1e9
        
        # Initialize population
        self.population: List[Individual] = [
            Individual(initial_weights.copy(), ind_id=0)
        ]
        for i in range(1, config.pop_size):
            mutated = mutate_weights(
                initial_weights,
                mutation_rate=self.current_rate,
                sigma=self.current_sigma,
            )
            self.population.append(Individual(mutated, ind_id=i))
            
        self.best_individual: Optional[Individual] = None
        self.history: List[Dict] = []

    def tournament_selection(self) -> Individual:
        indices = self.rng.choice(len(self.population), size=self.config.tournament_k, replace=False)
        candidates = [self.population[i] for i in indices]
        return max(candidates, key=lambda ind: ind.fitness)

    def evaluate(self, games_per_eval: int = 6):
        for ind in self.population:
            evaluate_individual_island(
                ind,
                self.base_adj,
                self.metadata,
                num_games=games_per_eval,
                bias_mode=self.config.bias_mode,
            )
        self.post_evaluate_sort()

    def post_evaluate_sort(self):
        self.population.sort(key=lambda ind: ind.fitness, reverse=True)
        current_best = self.population[0]
        if current_best.fitness > self.best_historical_fitness + 0.1:
            self.best_historical_fitness = current_best.fitness
            self.best_individual = copy.deepcopy(current_best)
            self.stagnation_counter = 0
            self.current_sigma = max(self.config.base_mutation_sigma, self.current_sigma * 0.85)
            self.current_rate = max(self.config.base_mutation_rate, self.current_rate * 0.90)
        else:
            self.stagnation_counter += 1
            if self.stagnation_counter >= self.config.stagnation_threshold:
                self.current_sigma = min(0.25, self.config.base_mutation_sigma * self.config.hypermutation_multiplier)
                self.current_rate = min(0.30, self.config.base_mutation_rate * 1.5)

    def step_reproduction(self):
        next_pop: List[Individual] = []
        for e in range(self.config.elite_count):
            elite = copy.deepcopy(self.population[e])
            elite.id = len(next_pop)
            next_pop.append(elite)
            
        while len(next_pop) < self.config.pop_size:
            p1 = self.tournament_selection()
            p2 = self.tournament_selection()
            child_w = crossover_weights(p1.weights, p2.weights)
            mut_w = mutate_weights(
                child_w,
                mutation_rate=self.current_rate,
                sigma=self.current_sigma,
            )
            next_pop.append(Individual(mut_w, ind_id=len(next_pop)))
            
        self.population = next_pop


import multiprocessing


class MultiIslandEvolution:
    def __init__(
        self,
        island_configs: Optional[List[IslandConfig]] = None,
        migration_interval: int = 20,
        games_per_eval: int = 6,
        seed: int = 42,
        use_scaled: bool = False,
        num_workers: int = 10,
    ):
        self.migration_interval = migration_interval
        self.games_per_eval = games_per_eval
        self.rng = np.random.default_rng(seed)
        self.use_scaled = use_scaled
        self.num_workers = min(num_workers, multiprocessing.cpu_count())
        
        if use_scaled:
            from forward_sim import load_scaled_subcircuit
            self.base_adj, self.metadata = load_scaled_subcircuit()
        else:
            self.base_adj, self.metadata = load_cached_subcircuit()
            
        self.initial_weights = extract_kc_mbon_dense(self.base_adj, self.metadata)
        
        if island_configs is None:
            # 10-Island M4 Architecture
            pop = 16 if use_scaled else 12
            island_configs = [
                IslandConfig("Jackpot Hunter", "jackpot", pop_size=pop, base_mutation_sigma=0.06),
                IslandConfig("Upper Bonus Specialist", "upper_bonus", pop_size=pop, base_mutation_sigma=0.05),
                IslandConfig("Balanced Maximizer", "balanced", pop_size=pop, base_mutation_sigma=0.05),
                IslandConfig("Hypermutation Explorer", "hypermutation", pop_size=pop, base_mutation_sigma=0.12, base_mutation_rate=0.15),
                IslandConfig("High-Roller Aggressive", "high_roller", pop_size=pop, base_mutation_sigma=0.07),
                IslandConfig("Conservative MinMax", "conservative", pop_size=pop, base_mutation_sigma=0.04),
                IslandConfig("Straight Runner", "straight", pop_size=pop, base_mutation_sigma=0.06),
                IslandConfig("Full-House Harvester", "full_house", pop_size=pop, base_mutation_sigma=0.05),
                IslandConfig("Adaptive Deme", "balanced", pop_size=pop, base_mutation_sigma=0.08),
                IslandConfig("Apex Champion Crucible", "apex", pop_size=pop, base_mutation_sigma=0.06),
            ]
            
        self.islands: List[Island] = [
            Island(cfg, self.initial_weights, self.base_adj, self.metadata, seed=seed + i * 100)
            for i, cfg in enumerate(island_configs)
        ]
        
        self.global_best_individual: Optional[Individual] = None
        self.global_best_fitness: float = -1e9
        self.history: List[Dict] = []
        
        # Multiprocessing pool for 10 M4 cores
        self.pool = None
        if self.num_workers > 1:
            self.pool = multiprocessing.Pool(
                processes=self.num_workers,
                initializer=_init_eval_worker,
                initargs=(self.base_adj, self.metadata),
            )

    def close(self):
        if self.pool is not None:
            self.pool.close()
            self.pool.join()
            self.pool = None

    def perform_migration(self):
        num_islands = len(self.islands)
        emigrants = [copy.deepcopy(isl.population[0]) for isl in self.islands]
        
        for i in range(num_islands):
            target_idx = (i + 1) % num_islands
            target_island = self.islands[target_idx]
            migrant = emigrants[i]
            local_champ = target_island.population[0]
            
            hybrid_weights = crossover_weights(migrant.weights, local_champ.weights)
            hybrid_ind = Individual(hybrid_weights, ind_id=len(target_island.population))
            
            target_island.population[-1] = migrant
            if len(target_island.population) > 1:
                target_island.population[-2] = hybrid_ind

    def step_generation(self, gen_idx: int) -> Dict:
        start_time = time.perf_counter()
        gen_stats = {
            "generation": gen_idx,
            "island_stats": [],
            "migrated": False,
        }
        
        # 1. Parallel evaluation across all islands & individuals
        if self.pool is not None:
            tasks = []
            for isl_idx, isl in enumerate(self.islands):
                for ind_idx, ind in enumerate(isl.population):
                    tasks.append((isl_idx, ind_idx, ind.weights, self.games_per_eval, isl.config.bias_mode))
                    
            results = self.pool.map(_eval_task_worker, tasks)
            for isl_idx, ind_idx, fit, stats in results:
                ind = self.islands[isl_idx].population[ind_idx]
                ind.fitness = fit
                ind.stats = stats
                
            for isl in self.islands:
                isl.post_evaluate_sort()
        else:
            for isl in self.islands:
                isl.evaluate(games_per_eval=self.games_per_eval)
                
        # Track global best
        for isl in self.islands:
            champ = isl.population[0]
            if champ.fitness > self.global_best_fitness:
                self.global_best_fitness = champ.fitness
                self.global_best_individual = copy.deepcopy(champ)
                
            isl_stat = {
                "name": isl.config.name,
                "best_fitness": champ.fitness,
                "mean_score": champ.stats["mean_score"],
                "max_score": champ.stats["max_score"],
                "upper_bonus_rate": champ.stats["upper_bonus_rate"],
                "yacht_count": champ.stats["yacht_count"],
                "sigma": isl.current_sigma,
                "stagnated": isl.stagnation_counter >= isl.config.stagnation_threshold,
            }
            gen_stats["island_stats"].append(isl_stat)
            
        # 2. Check and perform migration interval
        if gen_idx > 0 and gen_idx % self.migration_interval == 0:
            self.perform_migration()
            gen_stats["migrated"] = True
            
        # 3. Reproduction step for each island
        for isl in self.islands:
            isl.step_reproduction()
            
        gen_stats["duration_sec"] = time.perf_counter() - start_time
        gen_stats["global_best_fitness"] = self.global_best_fitness
        if self.global_best_individual:
            gen_stats["global_best_mean"] = self.global_best_individual.stats["mean_score"]
            gen_stats["global_best_max"] = self.global_best_individual.stats["max_score"]
            
        self.history.append(gen_stats)
        return gen_stats
