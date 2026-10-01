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


_CSR_MAP_CACHE = {}


def get_kc_mbon_csr_mapping(base_adj: sp.csr_matrix, metadata: Dict) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    cache_key = (base_adj.shape, base_adj.nnz)
    if cache_key in _CSR_MAP_CACHE:
        return _CSR_MAP_CACHE[cache_key]
        
    kc_slice, mbon_slice = get_kc_mbon_slices(metadata)
    kc_start = kc_slice.start
    mbon_start = mbon_slice.start
    mbon_end = mbon_slice.stop

    data_indices = []
    dense_rows = []
    dense_cols = []

    for r in range(kc_slice.start, kc_slice.stop):
        start_ptr = base_adj.indptr[r]
        end_ptr = base_adj.indptr[r + 1]
        cols = base_adj.indices[start_ptr:end_ptr]
        mask = (cols >= mbon_start) & (cols < mbon_end)
        matching_ptrs = np.arange(start_ptr, end_ptr)[mask]
        matching_cols = cols[mask] - mbon_start
        data_indices.extend(matching_ptrs)
        dense_rows.extend([r - kc_start] * len(matching_cols))
        dense_cols.extend(matching_cols)

    mapping = (
        np.array(data_indices, dtype=np.int32),
        np.array(dense_rows, dtype=np.int32),
        np.array(dense_cols, dtype=np.int32),
    )
    _CSR_MAP_CACHE[cache_key] = mapping
    return mapping


def set_kc_mbon_dense(
    base_adj: sp.csr_matrix,
    metadata: Dict,
    kc_mbon_dense: np.ndarray,
    preserve_topology: bool = True,
) -> sp.csr_matrix:
    """
    Creates a new CSR matrix with updated KC -> MBON weights.
    If preserve_topology is True, weights where original connection was 0 remain 0.
    PN -> KC, CX, and APL inhibitory weights remain completely untouched.
    Ultra-fast direct array update avoids expensive CSR <-> LIL roundtrips.
    """
    if preserve_topology:
        data_idx_arr, row_arr, col_arr = get_kc_mbon_csr_mapping(base_adj, metadata)
        new_adj = base_adj.copy()
        new_adj.data[data_idx_arr] = np.maximum(0.0, kc_mbon_dense[row_arr, col_arr])
        return new_adj
        
    kc_slice, mbon_slice = get_kc_mbon_slices(metadata)
    new_lil = base_adj.tolil(copy=True)
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
