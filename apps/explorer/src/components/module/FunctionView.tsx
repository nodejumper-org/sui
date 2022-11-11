// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useQuery } from '@tanstack/react-query';

import { useRpc } from '~/hooks/useRpc';

function FunctionView({ pkgId }: { pkgId: string }) {
    const rpc = useRpc();

    const { data } = useQuery(['get-function-data', pkgId], async () => {
        return await rpc.getNormalizedMoveModulesByPackage(pkgId);
    });

    if (!!data) {
        return (
            <div>
                {Object.entries(data).map(([name, result]) => (
                    <div
                        key={name}
                        className="bg-sui-grey-40 mb-2.5 px-5 py-4 rounded-lg text-body text-sui-grey-90"
                    >
                        <div className="font-semibold">{name}</div>
                    </div>
                ))}
            </div>
        );
    }

    return <div>{JSON.stringify(data)}</div>;
}

export default function FunctionViewWrapper({
    pkgId,
}: {
    pkgId: string | undefined;
}) {
    if (!!pkgId) {
        return <FunctionView pkgId={pkgId} />;
    } else {
        return <div />;
    }
}
