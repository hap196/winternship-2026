import anndata as ad
import pandas as pd

H5AD_FILE = "eoe_program_activity.h5ad"

adata = ad.read_h5ad(H5AD_FILE)

print("=" * 80)
print("H5AD FILE STRUCTURE")
print("=" * 80)

print(f"\nShape: {adata.shape} (n_obs x n_vars)")
print(f"Observations (cells/samples): {adata.n_obs}")
print(f"Variables (genes/features): {adata.n_vars}")

print("\n" + "=" * 80)
print("MAIN DATA MATRIX (X)")
print("=" * 80)
print(f"Type: {type(adata.X).__name__}")
print(f"Shape: {adata.X.shape}")
print(f"Dtype: {adata.X.dtype}")

print("\n" + "=" * 80)
print("OBSERVATIONS (obs) - Row annotations")
print("=" * 80)
print(f"Type: {type(adata.obs).__name__}")
print(f"Shape: {adata.obs.shape}")

metadata_cols = [col for col in adata.obs.columns if not col.startswith("new_program_")]
program_cols = [col for col in adata.obs.columns if col.startswith("new_program_")]

print(f"Metadata columns: {len(metadata_cols)}")
print(f"Program columns: {len(program_cols)}")
print(f"\nMetadata fields: {metadata_cols}")
print(f"Program fields (first 3): {program_cols[:3]}")

print("\nPreview (metadata only):")
print(adata.obs[metadata_cols].head())

print("\n" + "=" * 80)
print("VARIABLES (var) - Column annotations")
print("=" * 80)
print(f"Type: {type(adata.var).__name__}")
print(f"Shape: {adata.var.shape}")
print(f"Total programs: {len(adata.var)}")

if len(adata.var.columns) > 0:
    print(f"Metadata columns: {list(adata.var.columns)}")
    print("\nPreview:")
    print(adata.var.head())
else:
    print("Metadata columns: None")
    print(f"\nProgram names (first 10): {list(adata.var.index[:10])}")

if adata.obsm.keys():
    print("\n" + "=" * 80)
    print("OBSERVATION MATRICES (obsm)")
    print("=" * 80)
    for key in adata.obsm.keys():
        print(f"\n{key}:")
        print(f"  Type: {type(adata.obsm[key]).__name__}")
        print(f"  Shape: {adata.obsm[key].shape}")

if adata.varm.keys():
    print("\n" + "=" * 80)
    print("VARIABLE MATRICES (varm)")
    print("=" * 80)
    for key in adata.varm.keys():
        print(f"\n{key}:")
        print(f"  Type: {type(adata.varm[key]).__name__}")
        print(f"  Shape: {adata.varm[key].shape}")

if adata.layers.keys():
    print("\n" + "=" * 80)
    print("LAYERS")
    print("=" * 80)
    for key in adata.layers.keys():
        print(f"\n{key}:")
        print(f"  Type: {type(adata.layers[key]).__name__}")
        print(f"  Shape: {adata.layers[key].shape}")
        if hasattr(adata.layers[key], 'dtype'):
            print(f"  Dtype: {adata.layers[key].dtype}")

if adata.uns.keys():
    print("\n" + "=" * 80)
    print("UNSTRUCTURED DATA (uns)")
    print("=" * 80)
    for key in adata.uns.keys():
        print(f"\n{key}:")
        value = adata.uns[key]
        print(f"  Type: {type(value).__name__}")
        if hasattr(value, "shape"):
            print(f"  Shape: {value.shape}")
        if isinstance(value, dict):
            print(f"  Keys: {list(value.keys())}")
        elif isinstance(value, pd.DataFrame):
            print(f"  Columns: {list(value.columns)}")
        elif not hasattr(value, "shape"):
            print(f"  Value: {value}")

print("\n" + "=" * 80)
print("ANNDATA OBJECT SUMMARY")
print("=" * 80)
print(adata)
