class ReportGenerator:
    def __init__(
        self,
        model: AnalysisLLM
    ):
        self.model = model
        
    async def generate_report(
        self,
        data: pd.DataFrame,
        analysis: Dict[str, Any],
        visualizations: Dict[str, Any]
    ) -> Dict[str, Any]:
        # 1. 提取要点
        key_points = await self._extract_key_points(
            analysis
        )
        
        # 2. 生成结构
        structure = await self._create_structure(
            key_points
        )
        
        # 3. 撰写内容
        content = await self._write_content(
            structure,
            analysis,
            visualizations
        )
        
        return {
            "key_points": key_points,
            "structure": structure,
            "content": content
        }
        
    async def _extract_key_points(
        self,
        analysis: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        points = []
        
        # 1. 统计发现
        statistical_points = await self._extract_statistical_points(
            analysis["statistics"]
        )
        points.extend(statistical_points)
        
        # 2. 相关性发现
        correlation_points = await self._extract_correlation_points(
            analysis["correlations"]
        )
        points.extend(correlation_points)
        
        # 3. 趋势发现
        trend_points = await self._extract_trend_points(
            analysis["trends"]
        )
        points.extend(trend_points)
        
        return points
        
    async def _write_content(
        self,
        structure: Dict[str, Any],
        analysis: Dict[str, Any],
        visualizations: Dict[str, Any]
    ) -> Dict[str, str]:
        content = {}
        
        # 1. 写摘要
        content["summary"] = await self._write_summary(
            structure,
            analysis
        )
        
        # 2. 写主体
        content["body"] = await self._write_body(
            structure,
            analysis,
            visualizations
        )
        
        # 3. 写结论
        content["conclusion"] = await self._write_conclusion(
            structure,
            analysis
        )
        
        return content
