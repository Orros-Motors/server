const { City } = require("../models/city.model");

exports.createCities = async (req, res) => {
  try {
    const cities = req.body.cities;

    if (!Array.isArray(cities) || cities.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Cities array is required" });
    }

    const inserted = [];

    for (const c of cities) {
      const name = c.name?.trim();
      if (!name) continue;

      let city = await City.findOne({ name });

      if (!city) {
        city = await City.create({
          name,
          state: c.state || "",
          country: c.country || "Nigeria",
          terminal: c.terminal?.trim() || "",
        });
      } else {
        city.state = c.state || city.state;
        city.country = c.country || city.country;
        city.terminal = c.terminal || city.terminal;
        await city.save();
      }

      inserted.push(city);
    }

    res.status(201).json({
      success: true,
      message: "Cities added/updated successfully",
      data: inserted,
    });
  } catch (err) {
    console.error("❌ Error adding cities:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllCities = async (req, res) => {
  try {
    const cities = await City.find().sort({ name: 1 });
    res.status(200).json({ success: true, data: cities });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateCity = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, state, country, terminal } = req.body;
    const updated = await City.findByIdAndUpdate(
      id,
      { name, state, country, terminal },
      { new: true }
    );
    if (!updated)
      return res
        .status(404)
        .json({ success: false, message: "City not found" });
    res.status(200).json({
      success: true,
      message: "City updated successfully",
      data: updated,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Delete a city
exports.deleteCity = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await City.findByIdAndDelete(id);
    if (!deleted)
      return res
        .status(404)
        .json({ success: false, message: "City not found" });
    res
      .status(200)
      .json({ success: true, message: "City deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
