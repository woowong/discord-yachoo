import copy
import json
import time
from dataclasses import dataclass
from pathlib import Path
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
    enable_dan = (bias_mode != "pure_snn")
    agent = FlyBrainAgent(snn=snn, sim_steps=12, pulse_steps=3, enable_dan_modulation=enable_dan)

    
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
    
    fitness = calculate_island_fitness(
        bias_mode=bias_mode,
        mean_score=mean_score,
        max_score=max_score,
        min_score=min_score,
        upper_sums=upper_sums,
        upper_bonuses=upper_bonuses,
        yacht_hits=yacht_hits,
        large_straight_hits=large_straight_hits,
        small_straight_hits=small_straight_hits,
        full_house_hits=full_house_hits,
        four_kind_hits=four_kind_hits,
        zero_count=zero_count,
        num_games=num_games,
    )
        
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


def calculate_island_fitness(
    bias_mode: str,
    mean_score: float,
    max_score: float,
    min_score: float,
    upper_sums: List[int],
    upper_bonuses: int,
    yacht_hits: int,
    large_straight_hits: int,
    small_straight_hits: int,
    full_house_hits: int,
    four_kind_hits: int,
    zero_count: int,
    num_games: int,
) -> float:
    """
    Computes fitness for specialized Quality-Diversity demes and legacy dopamine habitats.
    Includes continuous quadratic reward shaping for upper bonus: (UpperSum / 63)^2.
    """
    upper_rate = upper_bonuses / num_games
    yacht_rate = yacht_hits / num_games
    straight_rate = (small_straight_hits + large_straight_hits) / num_games
    large_rate = large_straight_hits / num_games
    full_house_rate = full_house_hits / num_games
    four_kind_rate = four_kind_hits / num_games
    avg_zeros = zero_count / num_games
    avg_upper_sum = float(np.mean(upper_sums)) if upper_sums else 0.0

    # 4 Strategic Quality-Diversity Demes
    if bias_mode in ("straight_hunter", "straight"):
        # Island 1 (Straight Hunter): Heavy dopamine rewards for straight formation and large straight hunting
        fitness = mean_score + (85.0 * straight_rate) + (50.0 * large_rate) + (15.0 * upper_rate) - (5.0 * avg_zeros)
    elif bias_mode in ("upper_saver", "upper_bonus"):
        # Island 2 (Upper 63 Saver): Continuous quadratic shaping ((UpperSum/63)^2) eliminating 63-point cliff
        quad_shaping = ((avg_upper_sum / 63.0) ** 2) * 55.0
        fitness = mean_score + quad_shaping + (75.0 * upper_rate) - (5.0 * avg_zeros)
    elif bias_mode in ("jackpot_predator", "jackpot"):
        # Island 3 (Jackpot Predator): Yacht, Full House, and Four-of-a-Kind focus
        fitness = mean_score + (55.0 * yacht_rate) + (45.0 * full_house_rate) + (35.0 * four_kind_rate) - (5.0 * avg_zeros)
    elif bias_mode in ("hybrid_synthesizer", "hybrid", "balanced"):
        # Island 4 (Hybrid Synthesizer): Balanced 200+ all-rounder synthesizing all specializations
        quad_shaping = ((avg_upper_sum / 63.0) ** 2) * 35.0
        fitness = mean_score + (55.0 * upper_rate) + (45.0 * straight_rate) + (40.0 * yacht_rate) + (25.0 * full_house_rate) + quad_shaping - (8.0 * avg_zeros)
    # Legacy modes for backward compatibility
    elif bias_mode == "satiety_gated":
        fitness = mean_score - (15.0 * avg_zeros) + (25.0 * full_house_rate) + (25.0 * upper_rate)
    elif bias_mode == "affordance_rpe":
        fitness = mean_score + (60.0 * upper_rate) + (50.0 * yacht_rate) + (avg_upper_sum / 63.0) * 30.0
    elif bias_mode == "dynamic_apl":
        fitness = 0.5 * mean_score + 0.5 * max_score + (50.0 * yacht_rate) + (40.0 * straight_rate) + (30.0 * four_kind_rate)
    elif bias_mode == "pure_snn":
        fitness = mean_score
    elif bias_mode == "hypermutation":
        fitness = mean_score + (35.0 * upper_rate) + (35.0 * yacht_rate)
    elif bias_mode == "high_roller":
        fitness = 0.5 * mean_score + 0.5 * max_score + (30.0 * yacht_rate)
    elif bias_mode == "conservative":
        fitness = mean_score + 0.5 * min_score - (5.0 * avg_zeros) + (15.0 * upper_rate)
    elif bias_mode == "full_house":
        fitness = mean_score + (50.0 * full_house_rate) + (30.0 * four_kind_rate)
    else:
        fitness = mean_score + (40.0 * yacht_rate) + (40.0 * upper_rate) + (20.0 * straight_rate)

    return float(fitness)


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
    enable_dan = (bias_mode != "pure_snn")
    agent = FlyBrainAgent(snn=snn, sim_steps=12, pulse_steps=3, enable_dan_modulation=enable_dan)
    
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
    
    fitness = calculate_island_fitness(
        bias_mode=bias_mode,
        mean_score=mean_score,
        max_score=max_score,
        min_score=min_score,
        upper_sums=upper_sums,
        upper_bonuses=upper_bonuses,
        yacht_hits=yacht_hits,
        large_straight_hits=large_straight_hits,
        small_straight_hits=small_straight_hits,
        full_house_hits=full_house_hits,
        four_kind_hits=four_kind_hits,
        zero_count=zero_count,
        num_games=games_per_eval,
    )

        
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
        migration_interval: int = 5,
        games_per_eval: int = 6,
        seed: int = 42,
        use_scaled: bool = False,
        num_workers: int = 10,
        preset: str = "strategic_qd",
    ):
        self.migration_interval = migration_interval
        self.games_per_eval = games_per_eval
        self.rng = np.random.default_rng(seed)
        self.use_scaled = use_scaled
        self.num_workers = min(num_workers, multiprocessing.cpu_count())
        self.preset = preset
        
        if use_scaled:
            from forward_sim import load_scaled_subcircuit
            self.base_adj, self.metadata = load_scaled_subcircuit()
        else:
            self.base_adj, self.metadata = load_cached_subcircuit()
            
        self.initial_weights = extract_kc_mbon_dense(self.base_adj, self.metadata)
        
        # Pre-seed Gen 0 with existing champion weights if available
        champ_name = "champion_fly_3d_weights.npz" if use_scaled else "champion_fly_weights.npz"
        champ_path = Path(__file__).resolve().parent.parent / "data" / champ_name
        if champ_path.exists():
            try:
                data = np.load(champ_path)
                if "weights" in data and data["weights"].shape == self.initial_weights.shape:
                    self.initial_weights = data["weights"].astype(np.float32)
                    print(f"Pre-seeded population with champion weights from {champ_name}")
            except Exception as e:
                print(f"Could not load champion weights: {e}")

        if island_configs is None:
            pop = 16 if use_scaled else 12
            if preset == "strategic_qd":
                # 4 Strategic Quality-Diversity Demes
                island_configs = [
                    IslandConfig("Island 1: Straight Hunter", "straight_hunter", pop_size=pop, base_mutation_sigma=0.06),
                    IslandConfig("Island 2: Upper 63 Saver", "upper_saver", pop_size=pop, base_mutation_sigma=0.05),
                    IslandConfig("Island 3: Jackpot Predator", "jackpot_predator", pop_size=pop, base_mutation_sigma=0.05),
                    IslandConfig("Island 4: Hybrid Synthesizer", "hybrid_synthesizer", pop_size=pop, base_mutation_sigma=0.07),
                ]
            else:
                # 4 Dopamine Evolution Islands (legacy)
                island_configs = [
                    IslandConfig("Island A: Satiety-Gated", "satiety_gated", pop_size=pop, base_mutation_sigma=0.05),
                    IslandConfig("Island B: Affordance RPE", "affordance_rpe", pop_size=pop, base_mutation_sigma=0.06),
                    IslandConfig("Island C: Dynamic APL Attention", "dynamic_apl", pop_size=pop, base_mutation_sigma=0.08),
                    IslandConfig("Island D: Pure SNN Control", "pure_snn", pop_size=pop, base_mutation_sigma=0.05),
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

    def run_evolution(
        self,
        num_generations: int = 100,
        save_name: Optional[str] = None,
        verbose: bool = True,
        checkpoint_interval: int = 25,
        checkpoint_callback: Optional[Callable[[int, int, Dict], None]] = None,
    ) -> Individual:
        """
        Executes multi-generation island neuroevolution with multi-core parallel processing
        and saves the elite champion weights.
        """
        from notion_reporter import format_milestone_notion_payload, save_notion_report_payload

        data_dir = Path(__file__).resolve().parent.parent / "data"
        if save_name is None:
            save_name = "champion_fly_v3_weights.npz"

        print(f"\n🚀 Launching Island Evolution ({len(self.islands)} Demes, {self.num_workers} Parallel Workers, Preset: {self.preset})...")
        print(f"   - Target generations: {num_generations}")
        print(f"   - Migration interval: every {self.migration_interval} generations (Ring topology)")
        print(f"   - Checkpoint interval: every {checkpoint_interval} generations")
        print(f"   - Connectome: {'Scaled 30k Bilateral' if self.use_scaled else 'Base 1.5k Subcircuit'}")
        for isl in self.islands:
            print(f"   - [{isl.config.name}] Mode: {isl.config.bias_mode}, Pop: {isl.config.pop_size}")

        start_total = time.perf_counter()
        for gen in range(num_generations):
            stats = self.step_generation(gen)
            if verbose and (gen % 5 == 0 or gen == num_generations - 1):
                best_mean = stats.get("global_best_mean", 0)
                best_fit = stats.get("global_best_fitness", 0)
                dur = stats.get("duration_sec", 0)
                print(f"[Gen {gen:3d}/{num_generations}] Best Fitness: {best_fit:.2f} | Mean: {best_mean:.1f} | Duration: {dur:.2f}s | Migrated: {stats['migrated']}")

            # Checkpoint trigger (Gen 0, every checkpoint_interval, and final gen)
            is_checkpoint = (gen == 0 or (gen + 1) % checkpoint_interval == 0 or gen == num_generations - 1)
            if is_checkpoint:
                payload = format_milestone_notion_payload(gen, num_generations, stats)
                saved_path = save_notion_report_payload(payload, gen)
                if verbose:
                    print(f"   📑 Generated Notion milestone payload for Gen {gen+1} -> {saved_path.name}")
                if checkpoint_callback is not None:
                    checkpoint_callback(gen, num_generations, stats)

        total_sec = time.perf_counter() - start_total
        print(f"\n🏆 Evolution Complete in {total_sec:.1f}s! Global Best Fitness: {self.global_best_fitness:.2f}")

        if self.global_best_individual is not None:
            out_path = data_dir / save_name
            np.savez_compressed(
                out_path,
                weights=self.global_best_individual.weights,
                fitness=self.global_best_fitness,
                stats=self.global_best_individual.stats,
            )
            print(f"💾 Saved elite champion weights to {out_path}")
            
            # Also save history
            hist_path = data_dir / "dopamine_island_history.json"
            with open(hist_path, "w", encoding="utf-8") as f:
                json.dump(self.history, f, indent=2)
            print(f"📊 Saved evolutionary history to {hist_path}")

        return self.global_best_individual


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Multi-Island Quality-Diversity Neuroevolution")
    parser.add_argument("--generations", type=int, default=100, help="Number of generations")
    parser.add_argument("--scaled", action="store_true", help="Use 30k scaled bilateral connectome")
    parser.add_argument("--workers", type=int, default=10, help="Number of parallel worker processes")
    parser.add_argument("--games", type=int, default=6, help="Games per evaluation")
    parser.add_argument("--migration-interval", type=int, default=5, help="Migration interval")
    parser.add_argument("--checkpoint-interval", type=int, default=25, help="Generations between Notion checkpoints")
    parser.add_argument("--preset", type=str, default="strategic_qd", choices=["strategic_qd", "dopamine"], help="Island preset")
    parser.add_argument("--save-name", type=str, default="champion_fly_v3_weights.npz", help="Weights save filename")
    args = parser.parse_args()

    engine = MultiIslandEvolution(
        use_scaled=args.scaled,
        num_workers=args.workers,
        games_per_eval=args.games,
        migration_interval=args.migration_interval,
        preset=args.preset,
    )
    try:
        engine.run_evolution(
            num_generations=args.generations,
            save_name=args.save_name,
            checkpoint_interval=args.checkpoint_interval,
        )
    finally:
        engine.close()


if __name__ == "__main__":
    main()

