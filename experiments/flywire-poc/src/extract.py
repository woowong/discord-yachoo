import argparse
import json
import os
from pathlib import Path
from typing import Dict, List, Tuple
import numpy as np
import scipy.sparse as sp

from client import create_client, get_flywire_token

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def extract_mushroom_body_online(client) -> Tuple[sp.csr_matrix, Dict]:
    """
    Query the FlyWire CAVE database for Mushroom Body Kenyon Cells and MBONs,
    and build a synaptic adjacency matrix.
    """
    print("Querying cell annotations from FlyWire FAFB...")
    mat_client = client.materialize
    tables = mat_client.get_tables()
    print(f"Available tables in datastack: {tables}")
    raise NotImplementedError(
        "Direct online query requires live table discovery with your authenticated user permissions. "
        "Use --demo to generate representative biological topology or check available tables."
    )


def generate_synthetic_mushroom_body(
    num_kc: int = 1500,
    num_mbon: int = 24,
    num_input_pn: int = 50,
    seed: int = 42
) -> Tuple[sp.csr_matrix, Dict]:
    """
    Generates a biologically faithful synthetic Mushroom Body subcircuit with synaptic scaling:
    - Projection Neurons (PN, Antennal Lobe inputs): 50
    - Kenyon Cells (KC, sparse expansion layer): ~1,500
    - Mushroom Body Output Neurons (MBON, output decision layer): 24
    - APL (Anterior Paired Lateral, feedback inhibition): 1
    
    Connectivity follows real Drosophila biology:
    - Each KC randomly samples 4-7 PNs (~10% claw connectivity) with coincidence threshold
    - KC -> MBON has normalized fan-in weights (~0.015-0.045)
    - APL provides feedback inhibition to all KCs
    """
    np.random.seed(seed)
    total_neurons = num_input_pn + num_kc + num_mbon + 1
    apl_idx = total_neurons - 1
    
    pn_indices = list(range(0, num_input_pn))
    kc_indices = list(range(num_input_pn, num_input_pn + num_kc))
    mbon_indices = list(range(num_input_pn + num_kc, num_input_pn + num_kc + num_mbon))
    
    rows: List[int] = []
    cols: List[int] = []
    weights: List[float] = []
    
    # 1. PN -> KC (Random convergent sampling: each KC receives 4-7 PN inputs)
    for kc in kc_indices:
        sampled_pns = np.random.choice(pn_indices, size=np.random.randint(4, 8), replace=False)
        for pn in sampled_pns:
            rows.append(pn)
            cols.append(kc)
            weights.append(float(np.random.uniform(0.4, 0.7)))
            
    # 2. KC -> MBON (Normalized convergent output: each MBON receives ~35-65% KC connections)
    for mbon in mbon_indices:
        connected_kcs = np.random.choice(kc_indices, size=int(num_kc * np.random.uniform(0.35, 0.65)), replace=False)
        # Scaled weight to avoid mass synchronous saturation
        base_weight = 1.8 / max(len(connected_kcs) * 0.08, 1.0)
        for kc in connected_kcs:
            rows.append(kc)
            cols.append(mbon)
            weights.append(float(np.random.uniform(base_weight * 0.5, base_weight * 1.5)))
            
    # 3. KC -> APL and APL -> KC (Lateral feedback inhibition)
    for kc in kc_indices:
        if np.random.rand() < 0.15:
            rows.append(kc)
            cols.append(apl_idx)
            weights.append(0.05)
            
        rows.append(apl_idx)
        cols.append(kc)
        weights.append(-0.6)
        
    adj_matrix = sp.csr_matrix(
        (weights, (rows, cols)),
        shape=(total_neurons, total_neurons),
        dtype=np.float32
    )
    
    # Heterogeneous neuron thresholds
    thresholds = np.full(total_neurons, 1.0, dtype=np.float32)
    # KCs require multiple coincident PN inputs
    thresholds[num_input_pn:num_input_pn + num_kc] = np.random.uniform(0.85, 1.15, size=num_kc)
    # MBONs have diverse receptive thresholds
    thresholds[num_input_pn + num_kc:num_input_pn + num_kc + num_mbon] = np.random.uniform(0.8, 1.4, size=num_mbon)
    
    metadata = {
        "dataset": "drosophila_mushroom_body_subgraph",
        "is_synthetic": True,
        "total_neurons": total_neurons,
        "total_synapses": len(weights),
        "layers": {
            "input_pn": {"start": 0, "count": num_input_pn},
            "kenyon_cells": {"start": num_input_pn, "count": num_kc},
            "mbon": {"start": num_input_pn + num_kc, "count": num_mbon},
            "apl_inhibition": {"index": apl_idx}
        },
        "thresholds": thresholds.tolist()
    }
    
    return adj_matrix, metadata


def save_subcircuit(adj_matrix: sp.csr_matrix, metadata: Dict, out_dir: Path = DATA_DIR):
    out_dir.mkdir(parents=True, exist_ok=True)
    matrix_path = out_dir / "mb_subcircuit_adj.npz"
    meta_path = out_dir / "mb_subcircuit_meta.json"
    
    sp.save_npz(matrix_path, adj_matrix)
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
        
    print(f"Subcircuit successfully saved:")
    print(f"  - Adjacency Matrix: {matrix_path} (shape: {adj_matrix.shape}, nnz: {adj_matrix.nnz})")
    print(f"  - Metadata: {meta_path}")


def main():
    parser = argparse.ArgumentParser(description="Extract Drosophila Mushroom Body subcircuit from FlyWire or generate benchmark topology.")
    parser.add_argument("--demo", action="store_true", help="Generate biological benchmark topology without querying remote CAVE")
    args = parser.parse_args()
    
    token = get_flywire_token()
    if not args.demo and token:
        try:
            client = create_client()
            adj, meta = extract_mushroom_body_online(client)
            save_subcircuit(adj, meta)
            return
        except Exception as e:
            print(f"Online extraction failed or not fully configured: {e}")
            print("Falling back to biological benchmark topology...")
            
    print("Extracting representative Drosophila Mushroom Body circuit (Kenyon Cells + MBONs)...")
    adj, meta = generate_synthetic_mushroom_body()
    save_subcircuit(adj, meta)


if __name__ == "__main__":
    main()
