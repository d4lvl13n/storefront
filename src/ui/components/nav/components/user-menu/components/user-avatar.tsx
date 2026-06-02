import Image from "next/image";
import { type UserDetailsFragment } from "@/gql/graphql";

type Props = {
	user: UserDetailsFragment;
};

/**
 * Header account avatar. On-brand emerald→teal gradient with a soft glow, a top
 * sheen for depth, and a hover lift — far more premium than a flat white disc.
 * A photo (when present) sits inside the same gradient ring.
 */
export const UserAvatar = ({ user }: Props) => {
	const label =
		user.firstName && user.lastName
			? `${user.firstName.slice(0, 1)}${user.lastName.slice(0, 1)}`
			: user.email.slice(0, 2);

	if (user.avatar) {
		return (
			<span
				className="block rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 p-[2px] shadow-[0_2px_12px_-3px_rgba(16,185,129,0.6)] transition-transform duration-200 hover:scale-105"
				aria-hidden="true"
			>
				<Image
					className="h-8 w-8 rounded-full border-2 border-background object-cover"
					src={user.avatar.url}
					width={32}
					height={32}
					alt=""
				/>
			</span>
		);
	}

	return (
		<span
			className="relative flex h-8 w-8 select-none items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-xs font-bold uppercase tracking-wider text-white shadow-[0_2px_12px_-3px_rgba(16,185,129,0.6)] ring-1 ring-white/15 transition-all duration-200 hover:scale-105 hover:shadow-[0_3px_16px_-2px_rgba(16,185,129,0.8)]"
			aria-hidden="true"
		>
			{/* Top sheen for a glossy, dimensional feel */}
			<span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
			<span className="relative drop-shadow-sm">{label}</span>
		</span>
	);
};
