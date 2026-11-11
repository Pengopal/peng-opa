package system.authz

import rego.v1

# Every OPA API call needs the shared bearer token, except the health probe.
default allow := false

allow if input.identity == opa.runtime().env.OPA_TOKEN

allow if input.path == ["health"]
