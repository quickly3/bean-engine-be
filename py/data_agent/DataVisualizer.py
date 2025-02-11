class DataVisualizer:
    def __init__(
        self,
        model: AnalysisLLM
    ):
        self.model = model
        
    async def create_visualizations(
        self,
        data: pd.DataFrame,
        analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        # 1. 选择图表类型
        chart_types = await self._select_charts(
            data,
            analysis
        )
        
        # 2. 生成图表
        charts = await self._generate_charts(
            data,
            chart_types
        )
        
        # 3. 优化展示
        optimized = await self._optimize_display(
            charts
        )
        
        return {
            "charts": charts,
            "layout": optimized
        }
        
    async def _select_charts(
        self,
        data: pd.DataFrame,
        analysis: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        charts = []
        
        # 1. 分布图表
        distribution_charts = await self._distribution_charts(
            data,
            analysis
        )
        charts.extend(distribution_charts)
        
        # 2. 关系图表
        relationship_charts = await self._relationship_charts(
            data,
            analysis
        )
        charts.extend(relationship_charts)
        
        # 3. 趋势图表
        trend_charts = await self._trend_charts(
            data,
            analysis
        )
        charts.extend(trend_charts)
        
        return charts
        
    async def _generate_charts(
        self,
        data: pd.DataFrame,
        chart_types: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        charts = []
        
        for chart_type in chart_types:
            # 1. 准备数据
            plot_data = await self._prepare_plot_data(
                data,
                chart_type
            )
            
            # 2. 设置样式
            style = await self._set_chart_style(
                chart_type
            )
            
            # 3. 生成图表
            chart = await self._plot_chart(
                plot_data,
                chart_type,
                style
            )
            
            charts.append({
                "type": chart_type,
                "data": plot_data,
                "style": style,
                "chart": chart
            })
            
        return charts
