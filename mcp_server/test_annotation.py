"""
Test script for annotation tools and caching functionality.
Run this from the mcp_server directory:
    python test_annotation.py
"""

import os
import sys
import time
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# Add parent directory to path to import tools
sys.path.insert(0, str(Path(__file__).parent))

from tools.annotation import _annotation_cache


def create_mock_mcp():
    """Create a mock MCP object that captures tool registrations"""

    class MockMCP:
        def __init__(self):
            self.tools = {}

        def tool(self):
            def decorator(func):
                self.tools[func.__name__] = func
                return func
            return decorator

    return MockMCP()


def run_tests():
    """Run comprehensive tests of annotation functionality"""

    print("=" * 80)
    print("ANNOTATION TOOL TESTING")
    print("=" * 80)

    # Check API key
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("\n❌ ERROR: OPENAI_API_KEY not found in environment")
        print("Make sure .env file is properly configured")
        return False

    print(f"\n✅ API Key found: {api_key[:20]}...")

    # Register tools
    print("\n" + "=" * 80)
    print("REGISTERING TOOLS")
    print("=" * 80)

    mock_mcp = create_mock_mcp()
    from tools.annotation import register_annotation_tools
    register_annotation_tools(mock_mcp)

    print(f"\n✅ Registered {len(mock_mcp.tools)} tools:")
    for tool_name in mock_mcp.tools.keys():
        print(f"   - {tool_name}")

    # Get tool functions
    annotate_program = mock_mcp.tools["annotate_program"]
    annotate_programs_batch = mock_mcp.tools["annotate_programs_batch"]
    get_annotation_cache_stats = mock_mcp.tools["get_annotation_cache_stats"]
    get_cached_annotation = mock_mcp.tools["get_cached_annotation"]
    clear_annotation_cache = mock_mcp.tools["clear_annotation_cache"]

    # Test 1: Check initial cache state
    print("\n" + "=" * 80)
    print("TEST 1: Initial Cache State")
    print("=" * 80)

    stats = get_annotation_cache_stats()
    print(f"Cache size: {stats['cache_size']}")
    print(f"Cached programs: {stats['cached_programs']}")
    assert stats['cache_size'] == 0, "Cache should be empty initially"
    print("✅ Cache is initially empty")

    # Test 2: First annotation (should call API)
    print("\n" + "=" * 80)
    print("TEST 2: First Annotation (API Call)")
    print("=" * 80)

    test_genes = ["CD3D", "CD3E", "CD3G", "CD4", "CD8A", "CD8B", "IL2", "IFNG", "TNF"]
    print(f"Annotating 'test_program_1' with {len(test_genes)} genes...")
    print(f"Genes: {', '.join(test_genes)}")

    start_time = time.time()
    result1 = annotate_program(
        program_name="test_program_1",
        genes=test_genes,
        top_cell_types=["T cells", "CD4+ T cells"]
    )
    elapsed1 = time.time() - start_time

    print(f"\n⏱️  Time elapsed: {elapsed1:.2f} seconds")

    if "error" in result1:
        print(f"\n❌ ERROR: {result1['error']}")
        return False

    print(f"\n✅ Annotation received:")
    print(f"   Program: {result1['program']}")
    print(f"   Name: {result1['name']}")
    print(f"   Description: {result1['description']}")
    print(f"   Category: {result1['category']}")
    print(f"   Confidence: {result1['confidence']}")
    print(f"   Cached: {result1['cached']}")

    assert result1['cached'] == False, "First call should not be cached"
    assert result1['program'] == "test_program_1"
    print("\n✅ Result correctly marked as not cached")

    # Test 3: Check cache after first call
    print("\n" + "=" * 80)
    print("TEST 3: Cache State After First Call")
    print("=" * 80)

    stats = get_annotation_cache_stats()
    print(f"Cache size: {stats['cache_size']}")
    print(f"Cached programs: {stats['cached_programs']}")
    assert stats['cache_size'] == 1, "Cache should have 1 entry"
    assert "test_program_1" in stats['cached_programs']
    print("✅ Annotation cached successfully")

    # Test 4: Second annotation (should use cache)
    print("\n" + "=" * 80)
    print("TEST 4: Second Annotation (From Cache)")
    print("=" * 80)

    print("Requesting same program again...")
    start_time = time.time()
    result2 = annotate_program(
        program_name="test_program_1",
        genes=test_genes
    )
    elapsed2 = time.time() - start_time

    print(f"\n⏱️  Time elapsed: {elapsed2:.2f} seconds")
    print(f"   Speedup: {elapsed1/elapsed2:.1f}x faster")

    print(f"\n✅ Cached result:")
    print(f"   Name: {result2['name']}")
    print(f"   Cached: {result2['cached']}")

    assert result2['cached'] == True, "Second call should be cached"
    assert result2['name'] == result1['name'], "Cached result should match original"
    assert elapsed2 < 0.1, "Cached lookup should be nearly instant"
    print("\n✅ Cache working correctly (instant lookup)")

    # Test 5: Get cached annotation directly
    print("\n" + "=" * 80)
    print("TEST 5: Direct Cache Lookup")
    print("=" * 80)

    cached = get_cached_annotation("test_program_1")
    print(f"Retrieved from cache: {cached['name']}")
    assert cached['cached'] == True
    print("✅ Direct cache lookup works")

    # Test 6: Lookup non-existent program
    print("\n" + "=" * 80)
    print("TEST 6: Cache Miss")
    print("=" * 80)

    missing = get_cached_annotation("nonexistent_program")
    print(f"Result: {missing}")
    assert "error" in missing
    print("✅ Cache miss handled correctly")

    # Test 7: Force refresh
    print("\n" + "=" * 80)
    print("TEST 7: Force Refresh (Bypass Cache)")
    print("=" * 80)

    print("Calling with force_refresh=True...")
    start_time = time.time()
    result3 = annotate_program(
        program_name="test_program_1",
        genes=test_genes,
        force_refresh=True
    )
    elapsed3 = time.time() - start_time

    print(f"\n⏱️  Time elapsed: {elapsed3:.2f} seconds")
    print(f"   Cached: {result3['cached']}")

    assert result3['cached'] == False, "Force refresh should bypass cache"
    assert elapsed3 > 0.5, "Force refresh should make API call (slower)"
    print("✅ Force refresh bypasses cache correctly")

    # Test 8: Batch annotation
    print("\n" + "=" * 80)
    print("TEST 8: Batch Annotation")
    print("=" * 80)

    programs_to_annotate = [
        {
            "program_name": "test_program_2",
            "genes": ["COL1A1", "COL1A2", "COL3A1", "FN1", "VIM"],
            "top_cell_types": ["Fibroblasts"]
        },
        {
            "program_name": "test_program_3",
            "genes": ["EPCAM", "KRT8", "KRT18", "KRT19"],
            "top_cell_types": ["Epithelial cells"]
        }
    ]

    print(f"Annotating {len(programs_to_annotate)} programs in batch...")
    start_time = time.time()
    batch_results = annotate_programs_batch(programs_to_annotate)
    elapsed_batch = time.time() - start_time

    print(f"\n⏱️  Time elapsed: {elapsed_batch:.2f} seconds")
    print(f"\n✅ Batch results:")
    for i, res in enumerate(batch_results, 1):
        print(f"\n   {i}. {res['program']}")
        print(f"      Name: {res['name']}")
        print(f"      Category: {res['category']}")
        print(f"      Cached: {res['cached']}")

    assert len(batch_results) == 2
    assert all(not r['cached'] for r in batch_results), "New programs should not be cached"
    print("\n✅ Batch annotation works correctly")

    # Test 9: Cache stats after batch
    print("\n" + "=" * 80)
    print("TEST 9: Cache After Batch")
    print("=" * 80)

    stats = get_annotation_cache_stats()
    print(f"Cache size: {stats['cache_size']}")
    print(f"Cached programs: {stats['cached_programs']}")
    assert stats['cache_size'] == 3, "Cache should have 3 programs"
    print("✅ All programs cached")

    # Test 10: Clear specific program from cache
    print("\n" + "=" * 80)
    print("TEST 10: Clear Specific Cache Entry")
    print("=" * 80)

    print("Clearing test_program_1 from cache...")
    clear_result = clear_annotation_cache("test_program_1")
    print(f"Result: {clear_result['message']}")
    print(f"Cache size: {clear_result['cache_size']}")

    stats = get_annotation_cache_stats()
    assert stats['cache_size'] == 2
    assert "test_program_1" not in stats['cached_programs']
    print("✅ Specific cache entry cleared")

    # Test 11: Clear entire cache
    print("\n" + "=" * 80)
    print("TEST 11: Clear Entire Cache")
    print("=" * 80)

    print("Clearing all cache entries...")
    clear_result = clear_annotation_cache()
    print(f"Result: {clear_result['message']}")

    stats = get_annotation_cache_stats()
    assert stats['cache_size'] == 0
    print("✅ Entire cache cleared")

    # Test 12: Error handling (no genes)
    print("\n" + "=" * 80)
    print("TEST 12: Error Handling (No Genes)")
    print("=" * 80)

    error_result = annotate_program(
        program_name="error_test",
        genes=[]
    )
    print(f"Result: {error_result}")
    assert "error" in error_result
    print("✅ Error handling works correctly")

    # Final summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print("\n✅ ALL TESTS PASSED!")
    print(f"\nTotal tests: 12")
    print(f"Cache implementation: In-memory dictionary")
    print(f"Final cache state: {get_annotation_cache_stats()}")

    return True


if __name__ == "__main__":
    try:
        success = run_tests()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ TEST FAILED WITH EXCEPTION:")
        print(f"   {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
