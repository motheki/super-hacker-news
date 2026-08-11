interface LoadingStateProps {
	label: string;
}

export const LoadingState = ({ label }: LoadingStateProps) => (
	<div className="py-12 text-center" role="status">
		<p>{label}</p>
	</div>
);
