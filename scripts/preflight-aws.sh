#!/bin/bash
# Shared AWS preflight for every ship's deploy.sh.
#
# Usage, from a ship's deploy.sh (after ECR_REPO is known):
#
#     source "$REPO_ROOT/scripts/preflight-aws.sh"
#     check_aws_credentials "$ECR_REPO" || exit 1
#
# WHY THIS IS SHARED rather than pasted into each deploy.sh: the bug that prompted
# it (JES-136) was three Scryfall call sites each carrying their own copy of a
# required header — the newest one didn't, and card copy was broken in production
# for a week. Three copies of this check would be the same shape of mistake. The
# Tabletop's log.ts is duplicated on purpose, but that reasoning (two Dockerfiles,
# incompatible OTel versions, a new build surface) doesn't apply to a shell helper
# that only ever runs on Jess's machine from a single checkout.

# Verify AWS credentials work AND point at the account the ECR URL names.
# Arg 1: an ECR repo or registry URL, e.g. 1234567890.dkr.ecr.us-west-2.amazonaws.com/foo
# On success, exports AWS_ACCOUNT for the caller to echo.
check_aws_credentials() {
    local ecr_url="$1"
    local aws_account ecr_account

    # Check credentials BEFORE building anything. An expired SSO token used to surface
    # at the ECR push -- minutes in, after a clean, a build, and a full Docker build --
    # as the cryptic "password is empty". This fails in under a second.
    #
    # Call this BEFORE any `kubectl cluster-info` check: EKS auth goes through the aws
    # CLI, so an expired token ALSO fails cluster-info, which then blames the kubeconfig.
    # Worse, cluster-info can succeed on cached creds, making that misdiagnosis
    # intermittent. Diagnose the real cause first.
    if ! aws_account="$(aws sts get-caller-identity --query Account --output text 2>/dev/null)"; then
        echo "❌ AWS credentials aren't valid${AWS_PROFILE:+ for profile '$AWS_PROFILE'}."
        echo "   Your SSO token has almost certainly expired."
        echo ""
        echo "   Refresh it (this opens a browser, so run it yourself):"
        echo "       aws sso login${AWS_PROFILE:+ --profile $AWS_PROFILE}"
        echo ""
        echo "   Then run this deploy again. Nothing has been built or deployed."
        return 1
    fi

    # ECR URLs are account-qualified, so a valid login to the WRONG account would
    # otherwise fail much later with an opaque permissions error on push.
    ecr_account="${ecr_url%%.*}"
    if [ "$aws_account" != "$ecr_account" ]; then
        echo "❌ Logged into the wrong AWS account."
        echo "   You are:      ${aws_account}${AWS_PROFILE:+ (profile '$AWS_PROFILE')}"
        echo "   ECR wants:    ${ecr_account}  (from the ECR repo URL)"
        echo ""
        echo "   Switch profiles with AWS_PROFILE=<profile> ./deploy.sh, or fix ECR_REPO."
        echo "   Nothing has been built or deployed."
        return 1
    fi

    AWS_ACCOUNT="$aws_account"
}
