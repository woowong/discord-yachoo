import sys
from pathlib import Path
import numpy as np

SRC_DIR = Path(__file__).resolve().parent.parent / "src"
sys.path.insert(0, str(SRC_DIR))

from forward_sim import load_cached_subcircuit
from synaptic_plasticity import (
    get_kc_mbon_slices,
    extract_kc_mbon_dense,
    set_kc_mbon_dense,
    mutate_weights,
    crossover_weights,
)


def test_kc_mbon_extraction():
    adj, meta = load_cached_subcircuit()
    dense = extract_kc_mbon_dense(adj, meta)
    assert dense.shape == (1500, 24)
    assert np.count_nonzero(dense) > 10000


def test_synaptic_plasticity_preserves_other_layers():
    adj, meta = load_cached_subcircuit()
    kc_slice, mbon_slice = get_kc_mbon_slices(meta)
    
    dense = extract_kc_mbon_dense(adj, meta)
    mutated_dense = mutate_weights(dense, mutation_rate=0.5, sigma=0.2)
    
    new_adj = set_kc_mbon_dense(adj, meta, mutated_dense, preserve_topology=True)
    
    # Check that KC->MBON actually changed
    new_dense = extract_kc_mbon_dense(new_adj, meta)
    assert not np.array_equal(dense, new_dense)
    
    # Topology check: where original was 0, it must still be 0
    orig_zero_mask = (dense == 0.0)
    assert np.all(new_dense[orig_zero_mask] == 0.0)
    
    # Crucial biological check: PN->KC must be IDENTICAL
    pn_slice = slice(0, meta["layers"]["input_pn"]["count"])
    orig_pn_kc = adj[pn_slice, kc_slice].toarray()
    new_pn_kc = new_adj[pn_slice, kc_slice].toarray()
    assert np.array_equal(orig_pn_kc, new_pn_kc)
    
    # Crucial biological check: APL inhibition must be IDENTICAL
    apl_idx = meta["layers"]["apl_inhibition"]["index"]
    assert np.array_equal(adj[apl_idx, :].toarray(), new_adj[apl_idx, :].toarray())
    assert np.array_equal(adj[:, apl_idx].toarray(), new_adj[:, apl_idx].toarray())


def test_crossover():
    w1 = np.ones((10, 10))
    w2 = np.zeros((10, 10))
    child = crossover_weights(w1, w2, blend_ratio=0.5)
    assert child.shape == (10, 10)
    assert np.any(child == 1.0)
    assert np.any(child == 0.0)


def test_scaled_kc_mbon_plasticity():
    from forward_sim import load_scaled_subcircuit
    adj, meta = load_scaled_subcircuit()
    dense = extract_kc_mbon_dense(adj, meta)
    assert dense.shape == (29000, 48)
    
    mutated = mutate_weights(dense, mutation_rate=0.1, sigma=0.05)
    new_adj = set_kc_mbon_dense(adj, meta, mutated, preserve_topology=True)
    assert new_adj.shape == adj.shape
    assert new_adj.nnz == adj.nnz
    
    new_dense = extract_kc_mbon_dense(new_adj, meta)
    assert not np.array_equal(dense, new_dense)
    orig_zero = (dense == 0.0)
    assert np.all(new_dense[orig_zero] == 0.0)
