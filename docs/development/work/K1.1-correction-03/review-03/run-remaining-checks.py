"""Run the existing verification steps skipped by the composed adoption exception.
This does not alter C, add test cases, repair a registry, or turn verify into a pass.
Usage: PATH=<Node26.10.0>/bin:$PATH python3 -B run-remaining-checks.py C_TREE
"""
import datetime, importlib.util, json, os, pathlib, re, subprocess, sys, time

root = pathlib.Path(sys.argv[1]).resolve()
evidence = pathlib.Path(__file__).resolve().parent
loader = importlib.util.spec_from_file_location('review_packet_tools', root / 'scripts/packet_tools.py')
packet = importlib.util.module_from_spec(loader)
sys.modules[loader.name] = packet
loader.loader.exec_module(packet)
revision = '2bf220e9e426c810f2505fa2d74d70197807e584'
spec_path = 'docs/development/work/K1.1-correction-03/verification.json'
git = packet.Git(root)
packet.clean_payload(git, revision)
spec = git.document(revision, spec_path)
declaration = packet.environment_declaration(spec['environment'])
inputs = packet.declared_inputs(spec, declaration)
environment, _ = packet.child_environment(declaration)
assert subprocess.check_output(['node', '--version'], env=environment, text=True).strip() == 'v26.10.0'
records = []
for step in [*spec['checks'][3:], {'id': 'area-gate', 'operation': 'gate', 'spec': spec_path, 'expected': 'reported'}]:
    name = step['id']
    row = dict(id=name, source_specification=spec_path, source_revision=revision,
               start_utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
               cwd=str(root), node='v26.10.0', parallel_validation_jobs=0)
    start = time.monotonic()
    print('Running existing verification step ' + name, flush=True)
    try:
        packet.clean_payload(git, revision)
        if 'operation' in step:
            result = getattr(packet, {'gate': 'area_gate'}.get(step['operation'], step['operation']))(git, revision, step['spec'])
            row.update(operation=step['operation'], passed=result['result'] == step['expected'], result=result)
        else:
            with packet.step_inputs(git, inputs, step) as (provided, facts):
                env, environment_record = packet.child_environment(declaration, provided)
                if 'catalog' in step:
                    catalog_facts, run, tree = packet.catalog_run(git, revision, step, env, None)
                    catalog = packet.catalog_summary(catalog_facts, tree)
                else:
                    catalog = None
                    run = packet.command(step['argv'], root, step['timeout_seconds'], step['output_limit_bytes'], env)
            counts = {}
            for label, expression in step.get('counts', {}).items():
                matches = re.findall(expression, run['output'], re.MULTILINE)
                assert len(matches) == 1 and isinstance(matches[0], str), (name, label, matches)
                counts[label] = int(matches[0])
            passed = run['status'] == 'finished' and run['exit'] == 0
            passed = passed and all(counts.get(k, -1) >= v for k, v in step.get('minimum_counts', {}).items())
            passed = passed and all(counts.get(k) == v for k, v in step.get('exact_counts', {}).items())
            passed = passed and (catalog is None or catalog['valid'])
            row.update(argv=step.get('argv') or catalog_facts['script_text'], passed=passed,
                       counts=counts, environment=environment_record, inputs=facts, catalog=catalog, **run)
            (evidence / ('remaining-' + name + '.log')).write_text(run['output'])
        packet.clean_payload(git, revision)
    except Exception as error:
        row.update(passed=False, error_type=type(error).__name__, error=str(error))
    row.update(elapsed_seconds=time.monotonic()-start, end_utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
               clean_after=subprocess.check_output(['git', 'status', '--porcelain'], cwd=root, text=True))
    (evidence / ('remaining-' + name + '.json')).write_text(json.dumps(row, indent=2) + '\n')
    records.append({k: v for k, v in row.items() if k in ('id','passed','error','error_type','start_utc','end_utc','elapsed_seconds','clean_after','counts','exit','status')})
    (evidence / 'remaining-checks.json').write_text(json.dumps(records, indent=2) + '\n')
    print(json.dumps(records[-1]), flush=True)
