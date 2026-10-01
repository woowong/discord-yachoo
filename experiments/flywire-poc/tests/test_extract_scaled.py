import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

import numpy as np
import scipy.sparse as sp
import pytest
from extract import generate_scaled_bilateral_connectome


def test_generate_scaled_bilateral_connectome():
    # Use smaller scale for fast unit testing
    adj, meta = generate_scaled_bilateral_connectome(
        num_kc_per_hemi=500,
        num_pn_per_hemi=50,
        num_mbon_per_hemi=24,
        num_cx=100,
        seed=42
    )
    
    assert isinstance(adj, sp.csr_matrix)
    expected_neurons = (50 * 2) + (500 * 2) + 100 + 2 + (24 * 2)
    assert meta["total_neurons"] == expected_neurons
    assert adj.shape == (expected_neurons, expected_neurons)
    assert meta["total_synapses"] == adj.nnz
    assert adj.nnz > 0
    
    # Check 3D coordinates
    coords = np.array(meta["coordinates_3d"])
    assert coords.shape == (expected_neurons, 3)
    assert len(meta["regions"]) == expected_neurons
    
    # Verify bilateral symmetry of Antennal Lobes
    pn_left_coords = coords[0:50]
    pn_right_coords = coords[50:100]
    assert np.mean(pn_left_coords[:, 0]) < 0  # Left hemisphere x < 0
    assert np.mean(pn_right_coords[:, 0]) > 0  # Right hemisphere x > 0
    
    # Check thresholds
    assert len(meta["thresholds"]) == expected_neurons
