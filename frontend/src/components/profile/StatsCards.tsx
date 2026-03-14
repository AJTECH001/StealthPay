import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '../ui/GlassCard';
import { Shimmer } from '../ui/Shimmer';

interface StatsCardsProps {
    stats: {
        total: number;
        pending: number;
        settled: number;
    };
    loading: boolean;
    itemVariants?: any;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, loading, itemVariants }) => {
    return (
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <GlassCard className="p-8 flex flex-col justify-center group hover:border-white/20">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">Total Invoices</span>
                {loading ? (
                    <Shimmer className="h-10 w-16 bg-white/5 rounded-md" />
                ) : (
                    <h2 className="text-4xl font-bold text-white tracking-tighter">{stats.total}</h2>
                )}
            </GlassCard>
            <GlassCard className="p-8 flex flex-col justify-center group hover:border-white/20">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">Pending</span>
                {loading ? (
                    <Shimmer className="h-10 w-16 bg-white/5 rounded-md" />
                ) : (
                    <h2 className="text-4xl font-bold text-amber-500 tracking-tighter">{stats.pending}</h2>
                )}
            </GlassCard>
            <GlassCard className="p-8 flex flex-col justify-center group hover:border-white/20">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">Settled</span>
                {loading ? (
                    <Shimmer className="h-10 w-16 bg-white/5 rounded-md" />
                ) : (
                    <h2 className="text-4xl font-bold text-white tracking-tighter">{stats.settled}</h2>
                )}
            </GlassCard>
        </motion.div>
    );
};
