import copy
from typing import Dict, Tuple
import numpy as np
import scipy.sparse as sp


def get_kc_mbon_slices(metadata: Dict) -> Tuple[slice, slice]:
    layers = metadata["layers"]
    kc_start = layers["kenyon_cells"]["start"]
    kc_count = layers["kenyon_cells"]["count"]
    mbon_start = layers["mbon"]["start"]
    mbon_count = layers["mbon"]["count"]
    return (
        slice(kc_start, kc_start + kc_count),
        slice(mbon_start, mbon_start + mbon_count),
    )


def extract_kc_mbon_weights(adj_matrix: sp.csr_matrix, metadata: Dict) -> np.ndarray:
    """
    Extracts the non-zero weights of KC -> MBON synapses as a 1D array.
    Also returns the sparse coordinate mask for reconstructing the matrix.
    """
    kc_slice, mbon_slice = get_kc_mbon_slices(metadata)
    kc_mbon_sub = adj_matrix[kc_slice, mbon_slice].tocoo()
    return kc_mbon_sub.data.copy()


def extract_kc_mbon_dense(adj_matrix: sp.csr_matrix, metadata: Dict) -> np.ndarray:
    """
    Extracts the KC -> MBON block as a dense (num_kc, num_mbon) float32 matrix.
    """
    kc_slice, mbon_slice = get_kc_mbon_slices(metadata)
    return adj_matrix[kc_slice, mbon_slice].toarray()


def set_kc_mbon_dense(
    base_adj: sp.csr_matrix,
    metadata: Dict,
    kc_mbon_dense: np.ndarray,
    preserve_topology: bool = True,
) -> sp.csr_matrix:
    """
    Creates a new CSR matrix with updated KC -> MBON weights.
    If preserve_topology is True, weights where original connection was 0 remain 0.
    PN -> KC and APL inhibitory weights remain completely untouched.
    """
    kc_slice, mbon_slice = get_kc_mbon_slices(metadata)
    new_lil = base_adj.tolil(copy=True)
    
    if preserve_topology:
        orig_sub = base_adj[kc_slice, mbon_slice].toarray()
        topology_mask = orig_sub > 0
        masked_dense = np.where(topology_mask, np.maximum(0.0, kc_mbon_dense), 0.0)
        new_lil[kc_slice, mbon_slice] = masked_dense
    else:
        new_lil[kc_slice, mbon_slice] = np.maximum(0.0, kc_mbon_dense)
        
    return new_lil.tocsr()


def mutate_weights(
    weights: np.ndarray,
    mutation_rate: float = 0.15,
    sigma: float = 0.05,
    min_weight: float = 0.0,
    max_weight: float = 2.5,
) -> np.ndarray:
    """
    Applies Gaussian mutation to a subset of synaptic weights.
    """
    mutated = weights.copy()
    mask = np.random.rand(*weights.shape) < mutation_rate
    noise = np.random.normal(0.0, sigma, size=weights.shape)
    mutated[mask] += noise[mask]
    return np.clip(mutated, min_weight, max_weight)


def crossover_weights(w1: np.ndarray, w2: np.ndarray, blend_ratio: float = 0.5) -> np.ndarray:
    """
    Performs uniform crossover or blend crossover between two parents' weights.
    """
    mask = np.random.rand(*w1.shape) < blend_ratio
    return np.where(mask, w1, w2)
