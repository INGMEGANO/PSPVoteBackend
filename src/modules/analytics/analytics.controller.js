import AnalyticsService from "./analytics.service.js";

export default {

  rolesChart: async (req, res) => {
    try {
      const data = await AnalyticsService.getRolesChart();
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error obteniendo roles" });
    }
  },

  leadersChart: async (req, res) => {
    try {
      const data = await AnalyticsService.getLeadersChart();
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error obteniendo líderes" });
    }
  },

  puestosChart: async (req, res) => {
    try {
      const data = await AnalyticsService.getPuestosChart();
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error obteniendo puestos" });
    }
  },

  votacionesTimeChart: async (req, res) => {
    try {
      const data = await AnalyticsService.getVotacionesTimeChart();
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error obteniendo votaciones por fecha" });
    }
  },

  generoChart: async (req, res) => {
    try {
      const data = await AnalyticsService.getGeneroChart();
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error obteniendo distribución por género" });
    }
  }

};
