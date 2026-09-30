#!/bin/zsh
# Reviewer cost comparison (observation only): 3 fresh-process runs per shape, sequential.
S=/private/tmp/claude-501/-Users-rex-shih-Documents-ArrokothI-arrokothi/0a1ca599-4930-4cb0-9368-969f6540ae92/scratchpad
export TREE=$S/h
echo "node $(node --version); $(uname -srm); TREE=$TREE"
for rep in 1 2 3; do
  for shape in A-zeros A-empty-arrays A-empty-arrays-deep A-empty-objects-deep A-members-null \
               R-foreign R-foreign-deep R-foreign-arrays R-undefined-deep R-nan-deep R-too-deep R-cycle-deep \
               R-nonenumerable R-accessor R-undefined-members; do
    node --expose-gc --max-old-space-size=4096 --experimental-strip-types $S/review/cost-probe.mjs $shape 2>&1 | tail -1
  done
done
