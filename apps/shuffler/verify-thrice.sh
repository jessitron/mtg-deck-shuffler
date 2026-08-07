#!/bin/bash
# Run the verification suite three times in a row, sequentially.
#
# One green run doesn't distinguish "fixed" from "got lucky" — this suite's whole
# risk when waits are removed is flakiness, which only shows up across runs. Runs
# are strictly sequential: `data.db` is shared, so overlapping runs corrupt both
# each other's results and the timings.
#
# Prints a summary at the end. Exits nonzero if any run failed.

set -u

RUNS=${1:-3}
declare -a RESULTS=()
FAILED=0

for i in $(seq 1 "$RUNS"); do
    echo ""
    echo "############ run $i of $RUNS ############"
    START=$(date +%s)
    if ./verify.sh > "/tmp/verify-run-$i.log" 2>&1; then
        STATUS="PASS"
    else
        STATUS="FAIL"
        FAILED=1
    fi
    ELAPSED=$(( $(date +%s) - START ))

    # The reporter prints the run id and span count on its last line; the
    # Playwright summary line carries the pass/fail counts.
    RUNID=$(grep -o 'run [0-9a-f-]\{36\}' "/tmp/verify-run-$i.log" | tail -1)
    COUNTS=$(grep -E '^ *[0-9]+ (passed|failed)' "/tmp/verify-run-$i.log" | tail -1 | tr -s ' ')
    RESULTS+=("run $i: $STATUS  ${ELAPSED}s  $COUNTS  $RUNID")
    echo "run $i: $STATUS in ${ELAPSED}s — $COUNTS ($RUNID)"

    if [ "$STATUS" = "FAIL" ]; then
        echo "--- failures in run $i ---"
        grep -E '✘|✗|[0-9]+\) \[chromium\]' "/tmp/verify-run-$i.log" | head -20
    fi
done

echo ""
echo "############ summary ############"
for r in "${RESULTS[@]}"; do echo "  $r"; done
echo "full logs: /tmp/verify-run-N.log"
exit $FAILED
