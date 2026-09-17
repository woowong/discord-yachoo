import copy
import time
from typing import Dict, List, Optional
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


class Individual:
    def __init__(self, weights: np.ndarray, ind_id: int = 0):
        self.weights = weights.astype(np.float32)
        self.id = ind_id
        self.fitness = 0.0
        self.stats = {
            "mean_score": 0.0,
            "max_score": 0,
            "min_score": 0,
            "upper_bonus_rate": 0.0,
            "yacht_count": 0,
            "full_house_count": 0,
            "straight_count": 0,
            "zero_scores": 0,
        }


def evaluate_individual(
    ind: Individual,
    base_adj: sp.csr_matrix,
    metadata: Dict,
    num_games: int = 8,
    bias_mode: str = "neutral",
) -> float:
    """
    Evaluates an individual by playing num_games of Yacht and computing fitness.
    """
    adj = set_kc_mbon_dense(base_adj, metadata, ind.weights, preserve_topology=True)
    snn = FlySubcircuitSNN(adj, metadata)
    agent = FlyBrainAgent(snn=snn, sim_steps=15, pulse_steps=4)
    
    total_scores = []
    upper_bonuses = 0
    yacht_hits = 0
    large_straight_hits = 0
    full_house_hits = 0
    small_straight_hits = 0
    zero_count = 0
    
    for _ in range(num_games):
        game_res = play_single_game(agent, verbose=False)
        total_scores.append(game_res["total_score"])
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
            
        zero_count += sum(1 for pts in board.values() if pts == 0)
                    
    mean_score = float(np.mean(total_scores))
    max_score = int(np.max(total_scores))
    min_score = int(np.min(total_scores))
    upper_rate = upper_bonuses / num_games
    
    # Enhanced fitness: reward high average score, upper bonus, and successful patterns
    fitness = mean_score + (40.0 * upper_rate) + (5.0 * (full_house_hits + small_straight_hits) / num_games)
    
    # Bias modes
    if bias_mode == "dopamine_jackpot":
        fitness += (30.0 * yacht_hits / num_games) + (20.0 * large_straight_hits / num_games)
    elif bias_mode == "octopamine_aversion":
        fitness -= (4.0 * zero_count / num_games)
        
    ind.fitness = float(fitness)
    ind.stats = {
        "mean_score": mean_score,
        "max_score": max_score,
        "min_score": min_score,
        "upper_bonus_rate": upper_rate,
        "yacht_count": yacht_hits,
        "full_house_count": full_house_hits,
        "straight_count": small_straight_hits + large_straight_hits,
        "zero_scores": zero_count,
    }
    return ind.fitness


class ConnectomeEvolution:
    def __init__(
        self,
        pop_size: int = 35,
        elite_count: int = 5,
        tournament_k: int = 3,
        mutation_rate: float = 0.08,
        mutation_sigma: float = 0.06,
        games_per_eval: int = 8,
        bias_mode: str = "neutral",
        seed: int = 42,
    ):
        self.pop_size = pop_size
        self.elite_count = elite_count
        self.tournament_k = tournament_k
        self.mutation_rate = mutation_rate
        self.mutation_sigma = mutation_sigma
        self.games_per_eval = games_per_eval
        self.bias_mode = bias_mode
        
        np.random.seed(seed)
        self.base_adj, self.metadata = load_cached_subcircuit()
        self.initial_dense = extract_kc_mbon_dense(self.base_adj, self.metadata)
        
        # Initialize population
        self.population: List[Individual] = [
            Individual(self.initial_dense.copy(), ind_id=0)
        ]
        for i in range(1, pop_size):
            mutated = mutate_weights(
                self.initial_dense,
                mutation_rate=self.mutation_rate,
                sigma=self.mutation_sigma,
            )
            self.population.append(Individual(mutated, ind_id=i))
            
        self.history: List[Dict] = []
        self.best_individual: Optional[Individual] = None

    def tournament_selection(self) -> Individual:
        candidates = np.random.choice(self.population, size=self.tournament_k, replace=False)
        return max(candidates, key=lambda ind: ind.fitness)

    def step_generation(self, gen_idx: int) -> Dict:
        start_time = time.perf_counter()
        
        # Evaluate all individuals
        for ind in self.population:
            evaluate_individual(
                ind,
                self.base_adj,
                self.metadata,
                num_games=self.games_per_eval,
                bias_mode=self.bias_mode,
            )
            
        # Sort by fitness descending
        self.population.sort(key=lambda ind: ind.fitness, reverse=True)
        
        best = self.population[0]
        if self.best_individual is None or best.fitness > self.best_individual.fitness:
            self.best_individual = copy.deepcopy(best)
            
        scores = [ind.stats["mean_score"] for ind in self.population]
        gen_stat = {
            "gen": gen_idx,
            "best_fitness": best.fitness,
            "best_mean_score": best.stats["mean_score"],
            "best_max_score": best.stats["max_score"],
            "pop_mean_score": float(np.mean(scores)),
            "pop_std_score": float(np.std(scores)),
            "upper_bonus_rate": best.stats["upper_bonus_rate"],
            "yacht_hits": best.stats["yacht_count"],
            "full_house_hits": best.stats["full_house_count"],
            "straight_hits": best.stats["straight_count"],
            "duration_sec": time.perf_counter() - start_time,
        }
        self.history.append(gen_stat)
        
        # Reproduction for next generation
        next_pop: List[Individual] = []
        
        # 1. Elitism
        for e in range(self.elite_count):
            next_pop.append(Individual(self.population[e].weights.copy(), ind_id=len(next_pop)))
            
        # 2. Crossover and Mutation
        while len(next_pop) < self.pop_size:
            p1 = self.tournament_selection()
            p2 = self.tournament_selection()
            child_w = crossover_weights(p1.weights, p2.weights)
            mutated_w = mutate_weights(
                child_w,
                mutation_rate=self.mutation_rate,
                sigma=self.mutation_sigma,
            )
            next_pop.append(Individual(mutated_w, ind_id=len(next_pop)))
            
        self.population = next_pop
        return gen_stat

    def run(self, generations: int = 100, verbose: bool = True) -> List[Dict]:
        if verbose:
            print(f"=== Starting Connectome Neuroevolution: {generations} Gens, Pop: {self.pop_size}, Bias: {self.bias_mode} ===")
            print(f"{'Gen':<5} | {'Best Score':<12} | {'Pop Mean':<10} | {'Max Single':<10} | {'Bonus Rate':<10} | {'Time (s)'}")
            print("-" * 68)
            
        for g in range(1, generations + 1):
            stat = self.step_generation(g)
            if verbose and (g % 5 == 0 or g == 1 or g == generations):
                print(
                    f"{stat['gen']:<5} | "
                    f"{stat['best_mean_score']:<12.2f} | "
                    f"{stat['pop_mean_score']:<10.2f} | "
                    f"{stat['best_max_score']:<10} | "
                    f"{stat['upper_bonus_rate'] * 100:<9.1f}% | "
                    f"{stat['duration_sec']:.2f}s"
                )
        return self.history
