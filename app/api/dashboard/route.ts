import { db } from "@/lib/db"
import { users, assets, simCards, allocations } from "@/lib/db/schema"
import { eq, sql, count } from "drizzle-orm"
import { NextResponse } from "next/server"

export const revalidate = 60 // Cache the results for 60 seconds

export async function GET() {
  try {
    console.log("[v0] Dashboard API called")
    const [
      userStats,
      usersByRole,
      assetStats,
      simCardStats,
      allocationStats,
      assetsByType,
      recentAllocations,
      overdueLoans,
    ] = await Promise.all([
      // User statistics
      db.select({
        total: count(),
        active: sql<number>`count(*) filter (where ${users.active} = true)`,
      }).from(users),

      // Users by role
      db.select({
        role: users.role,
        count: count(),
      }).from(users).groupBy(users.role),

      // Asset statistics by status
      db.select({
        status: assets.status,
        count: count(),
      }).from(assets).groupBy(assets.status),

      // Sim Card statistics
      db.select({
        total: count(),
        inUse: sql<number>`count(*) filter (where ${simCards.status} = 'in_use')`,
        available: sql<number>`count(*) filter (where ${simCards.status} = 'available')`,
        banned: sql<number>`count(*) filter (where ${simCards.status} = 'banned')`,
      }).from(simCards),

      // Allocation statistics
      db.select({
        active: sql<number>`count(*) filter (where ${allocations.status} = 'active')`,
        returned: sql<number>`count(*) filter (where ${allocations.status} = 'returned')`,
      }).from(allocations),

      // Assets by type and status (for granular counting)
      db.select({
        type: assets.type,
        status: assets.status,
        count: count(),
      }).from(assets).groupBy(assets.type, assets.status),

      // Recent allocations
      db.query.allocations.findMany({
        with: { user: true, asset: true, simCard: true },
        orderBy: (allocations, { desc }) => [desc(allocations.createdAt)],
        limit: 5,
      }),

      // Overdue loans
      db.query.allocations.findMany({
        where: (allocations, { and, eq, lte }) =>
          and(
            eq(allocations.status, "active"),
            eq(allocations.isLoan, true),
            lte(allocations.returnDate, new Date().toISOString().split("T")[0])
          ),
        with: { user: true, asset: true },
        orderBy: (allocations, { asc }) => [asc(allocations.returnDate)],
      }),
    ])

    // Process asset stats list into a map for easier access
    const assetCounts = assetStats.reduce((acc, curr) => {
      acc[curr.status] = Number(curr.count)
      return acc
    }, {} as Record<string, number>)

    const totalAssets = assetStats.reduce((sum, curr) => sum + Number(curr.count), 0)

    // Calculate granular assets (Phones / Tablets)
    const granularAssets = {
      phone: { total: 0, active: 0, inactive: 0 },
      tablet: { total: 0, active: 0, inactive: 0 },
    }

    assetsByType.forEach(item => {
      const type = item.type?.toLowerCase();
      const count = Number(item.count);

      let targetGroup = null;
      if (type === 'celular' || type === 'phone' || type === 'smartphone') {
        targetGroup = granularAssets.phone;
      } else if (type === 'tablet') {
        targetGroup = granularAssets.tablet;
      }

      if (targetGroup) {
        targetGroup.total += count;
        if (item.status === 'in_use') {
          targetGroup.active += count;
        } else {
          // available or maintenance goes to inactive
          targetGroup.inactive += count;
        }
      }
    });

    return NextResponse.json({
      users: {
        total: Number(userStats[0].total),
        active: Number(userStats[0].active),
        byRole: usersByRole.map((d: any) => ({ ...d, count: Number(d.count) })),
      },
      assets: {
        total: totalAssets,
        available: assetCounts["available"] || 0,
        inUse: assetCounts["in_use"] || 0,
        maintenance: assetCounts["maintenance"] || 0,
        granular: granularAssets,
      },
      simCards: {
        total: Number(simCardStats[0].total),
        active: Number(simCardStats[0].inUse),
        available: Number(simCardStats[0].available),
        banned: Number(simCardStats[0].banned),
      },
      allocations: {
        active: Number(allocationStats[0].active),
        returned: Number(allocationStats[0].returned),
        recent: recentAllocations,
        overdueLoans: overdueLoans,
      },
    })
  } catch (error) {
    console.error("[v0] Error fetching dashboard:", error)
    return NextResponse.json({ error: "Erro ao buscar dados do dashboard", details: String(error) }, { status: 500 })
  }
}
